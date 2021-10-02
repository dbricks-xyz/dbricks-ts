import { Method } from 'axios';
import {
  Commitment, PublicKey, Signer, Transaction,
} from '@solana/web3.js';
import { IBrickArgs, instructionsAndSigners } from '../common.types';

// todo later this will be prod server url
export const DEFAULT_BASE_URL = 'http://localhost:3000';

export enum Protocol {
  Serum = 'Serum',
  Mango = 'Mango',
  Saber = 'Saber',
}

export enum Serum {
  PlaceOrder = 'PlaceOrder',
  CancelOrder = 'CancelOrder',
  InitMarket = 'InitMarket',
  SettleMarket = 'SettleMarket',
}

export const serumEndpoints = {
  PlaceOrder: 'POST /serum/orders',
  CancelOrder: 'POST /serum/orders/cancel',
  InitMarket: 'POST /serum/markets',
  SettleMarket: 'POST /serum/markets/settle',
};

export enum Mango {
  Deposit = 'Deposit',
  Withdraw = 'Withdraw',
  PlaceSpotOrder = 'PlaceSpotOrder',
  CancelSpotOrder = 'CancelSpotOrder',
  SettleSpotMarket = 'SettleSpotMarket',
  PlacePerpOrder = 'PlacePerpOrder',
  CancelPerpOrder = 'CancelPerpOrder',
  SettlePerpMarket = 'SettlePerpMarket'
}

export const mangoEndpoints = {
  Deposit: 'POST /mango/deposit',
  Withdraw: 'POST /mango/withdraw',
  PlaceSpotOrder: 'POST /mango/spot/place', // todo fix route
  CancelSpotOrder: 'POST /mango/spot/cancel',
  SettleSpotMarket: 'POST /mango/spot/settle',
  PlacePerpOrder: 'POST /mango/perp/place', // todo fix route
  CancelPerpOrder: 'POST /mango/perp/cancel',
  SettlePerpMarket: 'POST /mango/perp/settle',
};

export enum Saber {
  TBD = 'TBD',
}

export const saberEndpoints = {
  TBD: 'POST TBD',
};

// this is a way of doing nested enums in TS
export const Action = { Serum, Mango, Saber };
export const endpoints = { Serum: serumEndpoints, Mango: mangoEndpoints, Saber: saberEndpoints };
export type IAction = Serum | Mango | Saber;

export interface IRawBrick {
  protocol: Protocol,
  action: IAction,
  args: IBrickArgs,
}

export interface IParsedBrick {
  protocol: Protocol,
  action: IAction,
  method: Method,
  route: string,
  args: IBrickArgs,
}

export interface IFetchedBrick {
  protocol: Protocol,
  action: IAction,
  instructionsAndSigners: instructionsAndSigners[],
}

export interface IFlattenedBrick {
  protocol: Protocol,
  action: IAction,
  instructionsAndSigners: instructionsAndSigners,
}

export interface ISizedBrick {
  protocols: Protocol[],
  actions: IAction[],
  transaction: Transaction,
  signers: Signer[],
}

export interface IBuilderParams {
  ownerPubkey: PublicKey,
  connectionUrl: string,
  committment: Commitment,
  baseUrl?: string,
  apiKey?: string,
}
