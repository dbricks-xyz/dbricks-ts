/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import {
  Connection, Keypair, PublicKey, Signer, Transaction, TransactionSignature,
} from '@solana/web3.js';
import axios, { AxiosPromise, Method } from 'axios';
import winston from 'winston';
import events from 'events';
import { deserializeInstructionsAndSigners } from '../common.serializers';
import {
  connectedAdapter,
  DEFAULT_BASE_URL,
  endpoints,
  IBuilderParams,
  IFetchedBrick, IFinalBuildParams,
  IFlattenedBrick,
  IParsedBrick,
  IRawBrick,
  ISizedBrick,
} from './common.builder.types';
import { asyncTimeout } from '../common.utils';

export const builderEmitter = new events.EventEmitter.EventEmitter();

function logAndEmit(event: string, msg: string) {
  winston.debug(msg);
  builderEmitter.emit(event, msg);
}

export class Builder {
  connection: Connection;

  ownerPubkey: PublicKey;

  baseUrl: string;

  // not all methods require communicating with the api, hence it's ok for this to be blank
  apiKey?: string;

  rawBricks: IRawBrick[] = [];

  constructor({
    ownerPubkey,
    connectionUrl,
    committment,
    baseUrl = DEFAULT_BASE_URL,
    apiKey,
  } = {} as IBuilderParams) {
    this.connection = new Connection(connectionUrl, committment);
    this.baseUrl = baseUrl;
    this.ownerPubkey = ownerPubkey;
    this.apiKey = apiKey;
  }

  // --------------------------------------- core methods

  addBrick(brick: IRawBrick) {
    this.rawBricks.push(brick);
  }

  parseBricks(rawBricks: IRawBrick[]): IParsedBrick[] {
    const parsedBricks = rawBricks.map((b) => {
      // @ts-ignore
      const endpoint = endpoints[b.protocol][b.action];
      const [method, route] = endpoint.split(' ');
      return {
        protocol: b.protocol,
        action: b.action,
        method: method as Method,
        route,
        args: b.args,
      };
    });
    logAndEmit('parseBricks', `Parsed bricks: ${parsedBricks}`);
    return parsedBricks;
  }

  async fetchBricks(parsedBricks: IParsedBrick[]): Promise<IFetchedBrick[]> {
    const fetchedBricks: IFetchedBrick[] = [];
    const requests: AxiosPromise[] = [];
    logAndEmit('fetchBricks', 'Connecting to dbricks server, stand by...');
    parsedBricks.forEach((b) => {
      const request = axios({
        baseURL: this.baseUrl,
        method: b.method,
        url: b.route,
        data: {
          ...b.args,
          ownerPubkey: this.ownerPubkey.toBase58(),
        },
      });
      requests.push(request);
      fetchedBricks.push({
        protocol: b.protocol,
        action: b.action,
        instructionsAndSigners: [],
      });
    });
    const responses = await axios.all(requests);

    for (let i = 0; i < responses.length; i += 1) {
      fetchedBricks[i].instructionsAndSigners = deserializeInstructionsAndSigners(
        responses[i].data,
      );
    }
    logAndEmit('fetchBricks', `Fetched bricks from server: ${fetchedBricks}`);
    return fetchedBricks;
  }

  flattenBricks(fetchedBricks: IFetchedBrick[]): IFlattenedBrick[] {
    const flattenedBricks: IFlattenedBrick[] = [];
    fetchedBricks.forEach((b) => {
      b.instructionsAndSigners.forEach((i) => {
        if (i.instructions.length > 0) {
          flattenedBricks.push({
            protocol: b.protocol,
            action: b.action,
            instructionsAndSigners: i,
          });
        }
      });
    });
    logAndEmit('flattenBricks', `Flattened bricks: ${flattenedBricks}`);
    return flattenedBricks;
  }

  async optimallySizeBricks(flattenedBricks: IFlattenedBrick[]): Promise<ISizedBrick[]> {
    logAndEmit('optimallySizeBricks', `Attempting transaction with ${flattenedBricks.length} bricks.`);
    const attemptedBrick: ISizedBrick = {
      protocols: [],
      actions: [],
      transaction: new Transaction(),
      signers: [],
    };
    flattenedBricks.forEach((b) => {
      attemptedBrick.protocols.push(b.protocol);
      attemptedBrick.actions.push(b.action);
      attemptedBrick.transaction.add(...b.instructionsAndSigners.instructions);
      attemptedBrick.signers.push(...b.instructionsAndSigners.signers);
    });
    attemptedBrick.transaction.recentBlockhash = (await this.connection.getRecentBlockhash())
      .blockhash;
    attemptedBrick.transaction.feePayer = this.ownerPubkey;
    try {
      const buf = attemptedBrick.transaction.serialize({
        verifySignatures: false,
      });
      logAndEmit('optimallySizeBricks', `Transaction of size ${buf.length} fits ${flattenedBricks.length} bricks just ok.`);
      return [attemptedBrick];
    } catch (e) {
      const middle = Math.ceil(flattenedBricks.length / 2);
      logAndEmit('optimallySizeBricks', `Transaction with ${flattenedBricks.length} bricks is too large, breaking into 2 at ${middle}.`);
      const left = flattenedBricks.splice(0, middle);
      const right = flattenedBricks.splice(-middle);
      return [
        ...(await this.optimallySizeBricks(left)),
        ...(await this.optimallySizeBricks(right)),
      ];
    }
  }

  // if the exact same transaction has been executed before, we need to update the blockhash
  // otherwise it will fail with "This transaction has already been processed"
  async updateBlockhashOnSimilarTransactions(sizedBricks: ISizedBrick[]): Promise<ISizedBrick[]> {
    const sizedBricksCopy = [...sizedBricks];
    const stringifiedBricks: string[] = [];

    for (const brick of sizedBricksCopy) {
      while (brick.transaction.recentBlockhash
      && stringifiedBricks.indexOf(this.stringifySizedBrick(brick)) !== -1) {
        await asyncTimeout(2000);
        brick.transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;
      }
      stringifiedBricks.push(this.stringifySizedBrick(brick));
    }
    logAndEmit('updateBlockhashOnSimilarTransactions', 'Blockhash refreshed to prevent duplicates.');
    return sizedBricksCopy;
  }

  async executeBricks(
    sizedBricks: ISizedBrick[],
    keypair?: Keypair,
    connectedAdapter?: connectedAdapter,
    signCallback?: (tx: Transaction, ...args: any) => Promise<Transaction>,
    callbackArgs?: any[],
  ): Promise<void> {
    if (!keypair && !connectedAdapter && !signCallback) {
      throw new Error('You need to pass one of: 1)sign callback, 2)wallet adapter, 3)owner keypair');
    }
    for (const b of sizedBricks) {
      try {
        let sig;
        if (keypair) {
          sig = this.sendWithKeypair(b.transaction, keypair, b.signers);
        } else if (connectedAdapter) {
          sig = this.sendWithWallet(b.transaction, connectedAdapter, b.signers);
        } else if (signCallback) {
          sig = this.sendWithCallback(b.transaction, signCallback, callbackArgs, b.signers);
        }
        logAndEmit('executeBricks', `Transaction successful, ${sig}.`);
        for (let i = 0; i < b.protocols.length; i += 1) {
          logAndEmit('executeBricks', `${b.protocols[i]}/${b.actions[i]} brick executed.`);
        }
      } catch (e) {
        const msg = `Transaction failed, ${e}`;
        logAndEmit('executeBricksError', msg);
        // we don't want to continue the loop if we have a transaction failure.
        throw new Error(msg);
      }
    }
  }

  async sendWithKeypair(
    transaction: Transaction,
    keypair: Keypair,
    additionalSigners: Signer[],
  ): Promise<TransactionSignature> {
    transaction.sign(keypair, ...additionalSigners);
    return this.connection.sendRawTransaction(transaction.serialize());
  }

  async sendWithWallet(
    transaction: Transaction,
    connectedAdapter: connectedAdapter,
    additionalSigners: Signer[],
  ): Promise<TransactionSignature> {
    logAndEmit('executeBricksSign', 'Please sign the transaction (wallet might spawn BEHIND your browser window)');
    return connectedAdapter.sendTransaction(transaction, this.connection, {
      signers: additionalSigners,
    });
  }

  async sendWithCallback(
    transaction: Transaction,
    signCallback: (tx: Transaction, ...args: any) => Promise<Transaction>,
    callbackArgs: any[] = [],
    additionalSigners: Signer[],
  ): Promise<TransactionSignature> {
    const signedTransaction = await signCallback(transaction, ...callbackArgs);
    if (additionalSigners.length > 0) {
      signedTransaction.partialSign(...additionalSigners);
    }
    return this.connection.sendRawTransaction(signedTransaction.serialize());
  }

  async build({
    keypair,
    connectedAdapter,
    signCallback,
    callbackArgs,
  } = {} as IFinalBuildParams) {
    const parsedBricks = this.parseBricks(this.rawBricks);
    const fetchedBricks = await this.fetchBricks(parsedBricks);
    const flattenedBricks = this.flattenBricks(fetchedBricks);
    const sizedBricks = await this.optimallySizeBricks(flattenedBricks);
    const finalBricks = await this.updateBlockhashOnSimilarTransactions(sizedBricks);
    await this.executeBricks(finalBricks, keypair, connectedAdapter, signCallback, callbackArgs);
  }

  // --------------------------------------- helpers

  stringifySizedBrick(brick: ISizedBrick): string {
    let result = '';
    brick.transaction.instructions.forEach((instruction) => {
      result += instruction.data.toString();
    });
    result += brick.transaction.recentBlockhash;
    return result;
  }
}
