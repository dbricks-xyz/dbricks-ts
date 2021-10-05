export interface ISolendLenderWithdrawArgs {
  mintPubkey: string,
  quantity: string,
  isBorrow: boolean,
}

export interface ISolendLenderWithdrawParams extends ISolendLenderWithdrawArgs {
  ownerPubkey: string,
}
