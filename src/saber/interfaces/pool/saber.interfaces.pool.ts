export interface ISaberPoolDepositArgs {
    swapPubkey: string,
    tokenAmountA: string,
    tokenAmountB: string,
}
export interface ISaberPoolWithdrawArgs {
    swapPubkey: string,
    poolTokenAmount: string,
    withdrawMintPubkey: string,
}

export interface ISaberSwapArgs {
    swapPubkey: string,
    payingMintPubkey: string,
    swapAmount: string,
}

export interface ISaberPoolDepositParams extends ISaberPoolDepositArgs {
    ownerPubkey: string,
}
  
export interface ISaberPoolWithdrawParams extends ISaberPoolWithdrawArgs {
    ownerPubkey: string,
}
  
export interface ISaberSwapParams extends ISaberSwapArgs {
    ownerPubkey: string,
}