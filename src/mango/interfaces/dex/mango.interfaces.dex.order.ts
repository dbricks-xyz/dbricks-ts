import {
  ISerumDEXOrderCancelParams,
  ISerumDEXOrderPlaceParams,
} from '../../../serum/interfaces/dex/serum.interfaces.dex.order';

export interface IMangoDEXOrderPlaceParams extends ISerumDEXOrderPlaceParams{
  mangoAccountNumber: string,
}

export interface IMangoDEXOrderCancelParams extends ISerumDEXOrderCancelParams {
  mangoAccountNumber: string,
}
