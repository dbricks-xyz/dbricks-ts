import {
  Connection, PublicKey, Signer, Transaction, TransactionSignature,
} from '@solana/web3.js';
import axios, { AxiosPromise, Method } from 'axios';
import { instructionsAndSigners } from '../types/common.types';
import { deserializeInstructionsAndSigners } from '../common.serializers';

// --------------------------------------- types

export enum Protocol {
  Serum = 'Serum',
  Mango = 'Mango',
  Saber = 'Saber',
}

// store 3 pieces of info: name [space] method [space] route
export enum Serum {
  PlaceOrder = 'PlaceOrder POST /serum/orders',
  CancelOrder = 'CancelOrder POST /serum/orders/cancel',
  InitMarket = 'InitMarket POST /serum/markets',
  SettleMarket = 'SettleMarket POST /serum/markets/settle',
}

export enum Mango {
  Deposit = 'POST /tbd',
}

// this is a way of doing nested enums in TS
export const Action = { Serum, Mango };
export type ActionType = Serum | Mango;

type RawBrick = {
  protocol: Protocol,
  action: ActionType,
  args: any, // temp
}

type ParsedBrick = {
  protocol: Protocol,
  action: ActionType,
  method: Method,
  route: string,
  payload: any, // temp
}

type FetchedBrick = {
  protocol: Protocol,
  action: ActionType,
  instructionsAndSigners: instructionsAndSigners[],
}

type FlattenedBrick = {
  protocol: Protocol,
  action: ActionType,
  instructionsAndSigners: instructionsAndSigners,
}

type SizedBrick = {
  protocols: Protocol[],
  actions: ActionType[],
  transaction: Transaction,
  signers: Signer[],
}

// --------------------------------------- core

export class Builder {
  connection: Connection;

  rawBricks: RawBrick[] = [];

  ownerPubkey: PublicKey;

  baseUrl: string;

  constructor(connectionUrl: string, baseUrl: string, ownerPubkey: PublicKey) {
    this.connection = new Connection(connectionUrl);
    this.baseUrl = baseUrl;
    this.ownerPubkey = ownerPubkey;
  }

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
    console.log('Parsed bricks:', parsedBricks);
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
    console.log('Fetched bricks from server:', fetchedBricks);
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
    console.log('Flattened bricks', flattenedBricks);
    return flattenedBricks;
  }

  async optimallySizeBricks(flattenedBricks: FlattenedBrick[]): Promise<SizedBrick[]> {
    console.log(`Attempting transaction with ${flattenedBricks.length} bricks`);
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
      console.log(`Transaction of size ${buf.length} fits ${flattenedBricks.length} bricks just ok`);
      return [attemptedBrick];
    } catch (e) {
      const middle = Math.ceil(flattenedBricks.length / 2);
      console.log(`Transaction with ${flattenedBricks.length} bricks is too large, breaking into 2 at ${middle}`);
      const left = flattenedBricks.splice(0, middle);
      const right = flattenedBricks.splice(-middle);
      return [
        ...(await this.optimallySizeBricks(left)),
        ...(await this.optimallySizeBricks(right)),
      ];
    }
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
          console.log(`Transaction successful, ${sig}.`);
          for (let i = 0; i < b.protocols.length; i += 1) {
            console.log(`${b.protocols[i]}/${b.actions[i].split(' ')[0]} brick executed.`);
          }
        })
        .catch((e) => {
          console.log(`Transaction failed, ${e}.`);
        });
    });
    await Promise.all(promises)
      .then(() => {
        console.log('All transactions succeeded.');
      })
      .catch(() => {
        console.log('Some transactions failed, see log.');
      });
  }

  async build(signCallback: any) {
    const parsedBricks = this.parseBricks(this.rawBricks);
    const fetchedBricks = await this.fetchBricks(parsedBricks);
    const flattenedBricks = this.flattenBricks(fetchedBricks);
    const sizedBricks = await this.optimallySizeBricks(flattenedBricks);
    await this.executeBricks(sizedBricks, signCallback);
  }
}
