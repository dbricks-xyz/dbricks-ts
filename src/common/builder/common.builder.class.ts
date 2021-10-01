import {
  Connection, PublicKey, Transaction, TransactionSignature,
} from '@solana/web3.js';
import axios, { AxiosPromise, Method } from 'axios';
import winston from 'winston';
import { deserializeInstructionsAndSigners } from '../common.serializers';
import {
  BuilderParams,
  DEFAULT_BASE_URL,
  DEFAULT_CONNECTION_URL, FetchedBrick, FlattenedBrick,
  ParsedBrick,
  RawBrick, SizedBrick,
} from './common.builder.types';
import { asyncTimeout } from '../common.utils';

export class Builder {
  connection: Connection;

  ownerPubkey: PublicKey;

  baseUrl: string;

  // not all methods require communicating with the api, hence it's ok for this to be blank
  apiKey?: string;

  rawBricks: RawBrick[] = [];

  constructor({
    ownerPubkey,
    connectionUrl = DEFAULT_CONNECTION_URL,
    baseUrl = DEFAULT_BASE_URL,
    apiKey,
  } = {} as BuilderParams) {
    this.connection = new Connection(connectionUrl);
    this.baseUrl = baseUrl;
    this.ownerPubkey = ownerPubkey;
    this.apiKey = apiKey;
  }

  // --------------------------------------- core methods

  addBrick(brick: RawBrick) {
    this.rawBricks.push(brick);
  }

  parseBricks(rawBricks: RawBrick[]): ParsedBrick[] {
    const parsedBricks = rawBricks.map((b) => {
      const [_, method, route] = b.action.split(' ');
      return {
        protocol: b.protocol,
        action: b.action,
        method: method as Method,
        route,
        payload: b.args,
      };
    });
    winston.debug('Parsed bricks:', parsedBricks);
    return parsedBricks;
  }

  async fetchBricks(parsedBricks: ParsedBrick[]): Promise<FetchedBrick[]> {
    const fetchedBricks: FetchedBrick[] = [];
    const requests: AxiosPromise[] = [];
    parsedBricks.forEach((b) => {
      const request = axios({
        baseURL: this.baseUrl,
        method: b.method,
        url: b.route,
        data: {
          ...b.payload,
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
    winston.debug('Fetched bricks from server:', fetchedBricks);
    return fetchedBricks;
  }

  flattenBricks(fetchedBricks: FetchedBrick[]): FlattenedBrick[] {
    const flattenedBricks: FlattenedBrick[] = [];
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
    winston.debug('Flattened bricks', flattenedBricks);
    return flattenedBricks;
  }

  async optimallySizeBricks(flattenedBricks: FlattenedBrick[]): Promise<SizedBrick[]> {
    winston.debug(`Attempting transaction with ${flattenedBricks.length} bricks`);
    const attemptedBrick: SizedBrick = {
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
      winston.debug(`Transaction of size ${buf.length} fits ${flattenedBricks.length} bricks just ok`);
      return [attemptedBrick];
    } catch (e) {
      const middle = Math.ceil(flattenedBricks.length / 2);
      winston.debug(`Transaction with ${flattenedBricks.length} bricks is too large, breaking into 2 at ${middle}`);
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
  async updateBlockhashOnSimilarTransactions(sizedBricks: SizedBrick[]): Promise<SizedBrick[]> {
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
    return sizedBricksCopy;
  }

  // the reason we need to take a callback is because there are many different ways to sign
  // eg user can load keypair & sign directly, or they can use a wallet adapter
  async executeBricks(sizedBricks: SizedBrick[], signCallback: any): Promise<void> {
    const promises: Promise<TransactionSignature>[] = [];
    sizedBricks.forEach((b) => {
      // sign with the owner's keypair
      const signedTransaction = signCallback(b.transaction);
      // sign with additional signers
      if (b.signers.length > 0) {
        signedTransaction.sign(...b.signers);
      }
      const p = this.connection.sendRawTransaction(signedTransaction.serialize());
      promises.push(p);
      p
        .then((sig) => {
          winston.debug(`Transaction successful, ${sig}.`);
          for (let i = 0; i < b.protocols.length; i += 1) {
            winston.debug(`${b.protocols[i]}/${b.actions[i].split(' ')[0]} brick executed.`);
          }
        })
        .catch((e) => {
          winston.debug(`Transaction failed, ${e}.`);
        });
    });
    await Promise.all(promises)
      .then(() => {
        winston.debug('All transactions succeeded.');
      })
      .catch(() => {
        winston.debug('Some transactions failed, see log.');
      });
  }

  async build(signCallback: any) {
    const parsedBricks = this.parseBricks(this.rawBricks);
    const fetchedBricks = await this.fetchBricks(parsedBricks);
    const flattenedBricks = this.flattenBricks(fetchedBricks);
    const sizedBricks = await this.optimallySizeBricks(flattenedBricks);
    const finalBricks = await this.updateBlockhashOnSimilarTransactions(sizedBricks);
    await this.executeBricks(finalBricks, signCallback);
  }

  // --------------------------------------- helpers

  stringifySizedBrick(brick: SizedBrick): string {
    let result = '';
    brick.transaction.instructions.forEach((instruction) => {
      result += instruction.data.toString();
    });
    result += brick.transaction.recentBlockhash;
    return result;
  }
}
