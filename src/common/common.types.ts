import { Signer, TransactionInstruction } from '@solana/web3.js';
import { serializedInstruction, serializedSigner } from './common.serializers';
import {
  ISerumDEXMarketInitArgs,
  ISerumDEXMarketInitParams,
  ISerumDEXMarketSettleArgs,
  ISerumDEXMarketSettleParams,
  ISerumDEXOrderCancelArgs,
  ISerumDEXOrderCancelParams,
  ISerumDEXOrderPlaceArgs,
  ISerumDEXOrderPlaceParams,
} from '../serum';
import {
  IMangoDEXMarketInitArgs,
  IMangoDEXMarketInitParams,
  IMangoDEXMarketSettleArgs,
  IMangoDEXMarketSettleParams,
  IMangoDEXOrderCancelArgs,
  IMangoDEXOrderCancelParams,
  IMangoDEXOrderPlaceArgs,
  IMangoDEXOrderPlaceParams,
  IMangoLenderDepositArgs,
  IMangoLenderDepositParams,
  IMangoLenderWithdrawArgs,
  IMangoLenderWithdrawParams,
} from '../mango';
import {
  ISaberPoolDepositArgs,
  ISaberPoolDepositParams,
  ISaberPoolWithdrawArgs,
  ISaberPoolWithdrawParams,
  ISaberFarmArgs,
  ISaberFarmParams,
  ISaberFarmHarvestArgs,
  ISaberFarmHarvestParams,
  ISaberSwapArgs,
  ISaberSwapParams
} from '../saber';

export type instructionsAndSigners = {
  instructions: TransactionInstruction[],
  signers: Signer[],
}

export type serializedInstructionsAndSigners = {
  instructions: serializedInstruction[],
  signers: serializedSigner[],
}

export type IBrickArgs =
  // serum
  ISerumDEXOrderPlaceArgs | ISerumDEXOrderCancelArgs |
  ISerumDEXMarketInitArgs | ISerumDEXMarketSettleArgs |
  // mango
  IMangoLenderDepositArgs | IMangoLenderWithdrawArgs |
  IMangoDEXOrderPlaceArgs | IMangoDEXOrderCancelArgs |
  IMangoDEXMarketInitArgs | IMangoDEXMarketSettleArgs |
  //saber
  ISaberPoolDepositArgs | ISaberPoolWithdrawArgs |
  ISaberSwapArgs | ISaberFarmArgs | ISaberFarmHarvestArgs

export type IBrickParams =
  // serum
  ISerumDEXOrderPlaceParams | ISerumDEXOrderCancelParams |
  ISerumDEXMarketInitParams | ISerumDEXMarketSettleParams |
  // mango
  IMangoLenderDepositParams | IMangoLenderWithdrawParams |
  IMangoDEXOrderPlaceParams | IMangoDEXOrderCancelParams |
  IMangoDEXMarketInitParams | IMangoDEXMarketSettleParams |
  //saber
  ISaberPoolDepositParams | ISaberPoolWithdrawParams |
  ISaberSwapParams | ISaberFarmParams | ISaberFarmHarvestParams
