import { Signer, TransactionInstruction } from '@solana/web3.js';
import { serializedInstruction, serializedSigner } from './common.serializers';
import {
  ISerumDEXOrderCancelParams,
  ISerumDEXOrderPlaceParams,
} from '../serum/interfaces/dex/serum.interfaces.dex.order';
import {
  ISerumDEXMarketInitParams,
  ISerumDEXMarketSettleParams,
} from '../serum/interfaces/dex/serum.interfaces.dex.market';
import { IMangoLenderDepositParams } from '../mango/interfaces/lender/mango.interfaces.deposit';
import { IMangoLenderWithdrawParams } from '../mango/interfaces/lender/mango.interfaces.withdraw';
import {
  IMangoDEXOrderCancelParams,
  IMangoDEXOrderPlaceParams,
} from '../mango/interfaces/dex/mango.interfaces.dex.order';
import {
  IMangoDEXMarketInitParams,
  IMangoDEXMarketSettleParams,
} from '../mango/interfaces/dex/mango.interfaces.dex.market';

export type instructionsAndSigners = {
  instructions: TransactionInstruction[],
  signers: Signer[],
}

export type serializedInstructionsAndSigners = {
  instructions: serializedInstruction[],
  signers: serializedSigner[],
}

// --------------------------------------- aggregeated types

export type BrickPayload =
  // serum
  ISerumDEXOrderPlaceParams | ISerumDEXOrderCancelParams |
  ISerumDEXMarketInitParams | ISerumDEXMarketSettleParams |
  // mango
  IMangoLenderDepositParams | IMangoLenderWithdrawParams |
  IMangoDEXOrderPlaceParams | IMangoDEXOrderCancelParams |
  IMangoDEXMarketInitParams | IMangoDEXMarketSettleParams
