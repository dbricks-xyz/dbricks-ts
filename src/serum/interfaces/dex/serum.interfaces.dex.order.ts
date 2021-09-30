export type side = 'buy' | 'sell';
export type orderType = 'limit' | 'ioc' | 'postOnly' | undefined;

export interface ISerumDEXOrderPlaceParams {
  marketPubkey: string,
  side: side,
  price: string,
  size: string,
  orderType: orderType,
  ownerPubkey: string,
}

export interface ISerumDEXOrderCancelParams {
  marketPubkey: string,
  orderId: string,
  ownerPubkey: string,
}
