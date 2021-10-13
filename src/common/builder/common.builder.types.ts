import { Method } from 'axios';
import {
  Commitment, PublicKey, Signer, Transaction,
} from '@solana/web3.js';
import { IBrickArgs, instructionsAndSigners } from '../common.types';

// todo later this will be prod server url
export const DEFAULT_BASE_URL = 'http://localhost:3000';

// --------------------------------------- serum

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

// --------------------------------------- mango

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

// --------------------------------------- saber

export enum Saber {
  Swap = 'Swap',
  PoolDeposit = 'PoolDeposit',
  PoolWithdraw = 'PoolWithdraw',
  FarmDeposit = 'FarmDeposit',
  FarmWithdraw = 'FarmWithdraw',
  FarmHarvest = 'FarmHarvest',
}

export const saberEndpoints = {
  Swap: 'POST /saber/swap',
  PoolDeposit: 'POST /saber/pool/deposit',
  PoolWithdraw: 'POST /saber/pool/withdraw',
  FarmDeposit: 'POST /saber/farm/deposit',
  FarmWithdraw: 'POST /saber/farm/withdraw',
  FarmHarvest: 'POST /saber/farm/harvest',
};

// --------------------------------------- solend

export enum Solend {
  Deposit = 'Deposit',
  Withdraw = 'Withdraw',
  Borrow = 'Borrow',
  Repay = 'Repay',
}

export const solendEndpoints = {
  Deposit: 'POST solend/deposit',
  Withdraw: 'POST solend/withdraw',
  Borrow: 'POST solend/borrow',
  Repay: 'POST solend/repay',
};

// --------------------------------------- raydium

export enum Raydium {
  TBD = 'TBD',
}

export const raydiumEndpoints = {
  TBD: 'POST TBD',
};

// --------------------------------------- wormhole

export enum Wormhole {
  TBD = 'TBD',
}

export const wormholeEndpoints = {
  TBD: 'POST TBD',
};

// --------------------------------------- common

export enum Protocol {
  Serum = 'Serum',
  Mango = 'Mango',
  Saber = 'Saber',
  Solend = 'Solend',
  Raydium = 'Raydium',
  Wormhole = 'Wormhole',
}

// this is a way of doing nested enums in TS
export const Action = {
  Serum, Mango, Saber, Solend, Raydium, Wormhole,
};
export const endpoints = {
  Serum: serumEndpoints,
  Mango: mangoEndpoints,
  Saber: saberEndpoints,
  Solend: solendEndpoints,
  Raydium: raydiumEndpoints,
  Wormhole: wormholeEndpoints,
};
export type IAction = Serum | Mango | Saber | Solend | Raydium | Wormhole;

// --------------------------------------- interfaces

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
