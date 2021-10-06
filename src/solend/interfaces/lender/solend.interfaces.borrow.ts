export interface ISolendLenderBorrowArgs {
  mintPubkey: string,
  quantity: string,
}

export interface ISolendLenderBorrowParams extends ISolendLenderBorrowArgs {
  ownerPubkey: string,
}
