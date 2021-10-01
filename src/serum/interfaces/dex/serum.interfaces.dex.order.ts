export type side = 'buy' | 'sell';
export type orderType = 'limit' | 'ioc' | 'postOnly' | undefined;

export interface ISerumDEXOrderPlaceArgs {
  marketPubkey: string,
  side: side,
  price: string,
  size: string,
  orderType: orderType,
}

export interface ISerumDEXOrderCancelArgs {
  marketPubkey: string,
  orderId: string,
}

export interface ISerumDEXOrderPlaceParams extends ISerumDEXOrderPlaceArgs{
  ownerPubkey: string,
}

export interface ISerumDEXOrderCancelParams extends ISerumDEXOrderCancelArgs {
  ownerPubkey: string,
}
