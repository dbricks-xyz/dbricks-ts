export interface IMangoLenderWithdrawArgs {
  mintPubkey: string,
  quantity: string,
  isBorrow: boolean,
  mangoAccountNumber: string,
}

export interface IMangoLenderWithdrawParams extends IMangoLenderWithdrawArgs {
  ownerPubkey: string,
}
