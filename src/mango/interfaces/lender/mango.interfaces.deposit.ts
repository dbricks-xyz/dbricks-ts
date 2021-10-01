export interface IMangoLenderDepositArgs {
  mintPubkey: string,
  quantity: string,
  mangoAccountNumber: string,
}

export interface IMangoLenderDepositParams extends IMangoLenderDepositArgs {
  ownerPubkey: string,
}
