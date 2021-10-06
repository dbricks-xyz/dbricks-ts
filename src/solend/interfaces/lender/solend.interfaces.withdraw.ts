export interface ISolendLenderWithdrawArgs {
  mintPubkey: string,
  quantity: string,
}

export interface ISolendLenderWithdrawParams extends ISolendLenderWithdrawArgs {
  ownerPubkey: string,
}
