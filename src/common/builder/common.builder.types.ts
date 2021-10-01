import { Method } from 'axios';
import { PublicKey, Signer, Transaction } from '@solana/web3.js';
import { instructionsAndSigners } from '../common.types';

// todo later this will be prod server url
export const DEFAULT_BASE_URL = 'http://localhost:3000';
export const DEFAULT_CONNECTION_URL = 'https://api.mainnet-beta.solana.com';

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

export type RawBrick = {
  protocol: Protocol,
  action: ActionType,
  args: any, // temp
}

export type ParsedBrick = {
  protocol: Protocol,
  action: ActionType,
  method: Method,
  route: string,
  payload: any, // temp
}

export type FetchedBrick = {
  protocol: Protocol,
  action: ActionType,
  instructionsAndSigners: instructionsAndSigners[],
}

export type FlattenedBrick = {
  protocol: Protocol,
  action: ActionType,
  instructionsAndSigners: instructionsAndSigners,
}

export type SizedBrick = {
  protocols: Protocol[],
  actions: ActionType[],
  transaction: Transaction,
  signers: Signer[],
}

export type BuilderParams = {
  ownerPubkey: PublicKey,
  connectionUrl?: string,
  baseUrl?: string,
  apiKey?: string,
}
