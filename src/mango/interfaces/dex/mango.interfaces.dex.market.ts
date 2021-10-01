import {
  ISerumDEXMarketInitArgs,
  ISerumDEXMarketInitParams, ISerumDEXMarketSettleArgs,
  ISerumDEXMarketSettleParams,
} from '../../../serum';

export interface IMangoDEXMarketInitArgs extends ISerumDEXMarketInitArgs {}

export interface IMangoDEXMarketSettleArgs extends ISerumDEXMarketSettleArgs {
  mangoAccountNumber: string,
}

export interface IMangoDEXMarketInitParams extends ISerumDEXMarketInitParams {}

export interface IMangoDEXMarketSettleParams extends ISerumDEXMarketSettleParams {
  mangoAccountNumber: string,
}
