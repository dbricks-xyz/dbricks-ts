export interface ISerumDEXMarketInitParams {
  baseMintPubkey: string,
  quoteMintPubkey: string,
  lotSize: string,
  tickSize: string,
  ownerPubkey: string,
}

export interface ISerumDEXMarketSettleParams {
  marketPubkey: string,
  ownerPubkey: string,
}
