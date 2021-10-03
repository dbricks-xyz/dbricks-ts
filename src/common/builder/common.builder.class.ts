import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import axios, { AxiosPromise, Method } from 'axios';
import winston from 'winston';
import events from 'events';
import { deserializeInstructionsAndSigners } from '../common.serializers';
import {
  DEFAULT_BASE_URL,
  endpoints,
  IBuilderParams,
  IFetchedBrick,
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

    // eslint-disable-next-line no-restricted-syntax
    for (const brick of sizedBricksCopy) {
      while (brick.transaction.recentBlockhash
      && stringifiedBricks.indexOf(this.stringifySizedBrick(brick)) !== -1) {
        /* eslint-disable no-await-in-loop */
        await asyncTimeout(2000);
        brick.transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;
        /* eslint-enable no-await-in-loop */
      }
      stringifiedBricks.push(this.stringifySizedBrick(brick));
    }
    logAndEmit('updateBlockhashOnSimilarTransactions', 'Blockhash refreshed to prevent duplicates.');
    return sizedBricksCopy;
  }

  // the reason we need to take a callback is because there are many different ways to sign
  // eg user can load keypair & sign directly, or they can use a wallet adapter
  async executeBricks(
    sizedBricks: ISizedBrick[],
    signCallback: (tx: Transaction, ...args: any) => Promise<Transaction>,
    callbackArgs: any[] = [],
  ): Promise<void> {
    // eslint-disable-next-line no-restricted-syntax
    for (const b of sizedBricks) {
      logAndEmit('executeBricksSign', 'Please sign the transaction (wallet might spawn BEHIND your browser window)');
      // sign with the owner's keypair - we want this to be blocking for the loop
      // eslint-disable-next-line no-await-in-loop
      const signedTransaction = await signCallback(b.transaction, ...callbackArgs);
      // sign with additional signers
      if (b.signers.length > 0) {
        signedTransaction.sign(...b.signers);
      }
      // eslint-disable-next-line no-await-in-loop
      try {
        const sig = await this.connection.sendRawTransaction(signedTransaction.serialize());
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

  async build(signCallback: any, callbackArgs: any[] = []) {
    const parsedBricks = this.parseBricks(this.rawBricks);
    const fetchedBricks = await this.fetchBricks(parsedBricks);
    const flattenedBricks = this.flattenBricks(fetchedBricks);
    const sizedBricks = await this.optimallySizeBricks(flattenedBricks);
    const finalBricks = await this.updateBlockhashOnSimilarTransactions(sizedBricks);
    await this.executeBricks(finalBricks, signCallback, callbackArgs);
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
