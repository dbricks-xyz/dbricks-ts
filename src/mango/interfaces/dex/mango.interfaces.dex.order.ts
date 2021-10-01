import {
  ISerumDEXOrderCancelArgs,
  ISerumDEXOrderCancelParams, ISerumDEXOrderPlaceArgs,
  ISerumDEXOrderPlaceParams,
} from '../../../serum';

export interface IMangoDEXOrderPlaceArgs extends ISerumDEXOrderPlaceArgs{
  mangoAccountNumber: string,
}

export interface IMangoDEXOrderCancelArgs extends ISerumDEXOrderCancelArgs {
  mangoAccountNumber: string,
}

export interface IMangoDEXOrderPlaceParams extends ISerumDEXOrderPlaceParams{
  mangoAccountNumber: string,
}

export interface IMangoDEXOrderCancelParams extends ISerumDEXOrderCancelParams {
  mangoAccountNumber: string,
}
