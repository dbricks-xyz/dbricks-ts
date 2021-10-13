export interface ISaberFarmArgs {
    poolMintPubkey: string,
    amount: string,
}

export interface ISaberFarmHarvestArgs {
    poolMintPubkey: string,
}

export interface ISaberFarmParams extends ISaberFarmArgs {
    ownerPubkey: string,
}
  
export interface ISaberFarmHarvestParams extends ISaberFarmHarvestArgs {
    ownerPubkey: string,
}
