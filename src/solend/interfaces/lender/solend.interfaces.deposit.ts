export interface ISolendLenderDepositArgs {
  mintPubkey: string,
  quantity: string,
}

export interface ISolendLenderDepositParams extends ISolendLenderDepositArgs {
  ownerPubkey: string,
}
