import {
  ISerumDEXMarketInitParams,
  ISerumDEXMarketSettleParams,
} from '../../../serum/interfaces/dex/serum.interfaces.dex.market';

export interface IMangoDEXMarketInitParams extends ISerumDEXMarketInitParams {
}

export interface IMangoDEXMarketSettleParams extends ISerumDEXMarketSettleParams {
  mangoAccountNumber: string,
}
