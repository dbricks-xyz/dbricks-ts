export interface ISolendLenderRepayArgs {
  mintPubkey: string,
  quantity: string,
}

export interface ISolendLenderRepayParams extends ISolendLenderRepayArgs {
  ownerPubkey: string,
}
