export interface ISerumDEXMarketInitArgs {
  baseMintPubkey: string,
  quoteMintPubkey: string,
  lotSize: string,
  tickSize: string,
}

export interface ISerumDEXMarketSettleArgs {
  marketPubkey: string,
}

export interface ISerumDEXMarketInitParams extends ISerumDEXMarketInitArgs{
  ownerPubkey: string,
}

export interface ISerumDEXMarketSettleParams extends ISerumDEXMarketSettleArgs{
  ownerPubkey: string,
}
