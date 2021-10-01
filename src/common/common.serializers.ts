import {
  Keypair, PublicKey, Signer, TransactionInstruction,
} from '@solana/web3.js';
import { instructionsAndSigners, serializedInstructionsAndSigners } from './common.types';

export type serializedAccount = {
  pubkey: string,
  isSigner: boolean,
  isWritable: boolean,
}

export type serializedInstruction = {
  keys: serializedAccount[],
  programId: string,
  data: string,
}

export type serializedSigner = {
  secretKey: number[],
}

export function serializePubkey(pubkey: PublicKey): string {
  return pubkey.toBase58();
}

export function deserializePubkey(pubkey: string): PublicKey {
  return new PublicKey(pubkey);
}

export function serializeInstructions(
  instructions: TransactionInstruction[],
): serializedInstruction[] {
  const serializedInstruction: serializedInstruction[] = [];
  instructions.forEach((instruction) => {
    const newInstruction: serializedInstruction = {
      keys: [],
      programId: serializePubkey(instruction.programId),
      data: instruction.data.toString('hex'),
    };
    instruction.keys.forEach((k) => {
      newInstruction.keys.push(
        { pubkey: serializePubkey(k.pubkey), isSigner: k.isSigner, isWritable: k.isWritable },
      );
    });
    serializedInstruction.push(newInstruction);
  });
  return serializedInstruction;
}

export function deserializeInstructions(
  instructions: serializedInstruction[],
): TransactionInstruction[] {
  const deserializedInstructions: TransactionInstruction[] = [];
  instructions.forEach((instruction) => {
    const newInstruction: TransactionInstruction = {
      keys: [],
      programId: deserializePubkey(instruction.programId),
      data: Buffer.from(instruction.data, 'hex'),
    };
    instruction.keys.forEach((k) => {
      newInstruction.keys.push(
        { pubkey: deserializePubkey(k.pubkey), isSigner: k.isSigner, isWritable: k.isWritable },
      );
    });
    deserializedInstructions.push(newInstruction);
  });
  return deserializedInstructions;
}

export function serializeSigners(signers: Signer[]): serializedSigner[] {
  const serializedSigners: serializedSigner[] = [];
  signers.forEach((s) => {
    serializedSigners.push({
      secretKey: Array.from(s.secretKey),
    });
  });
  return serializedSigners;
}

export function deserializeSigners(signers: serializedSigner[]): Signer[] {
  const deserializedSigners: Signer[] = [];
  signers.forEach((s) => {
    deserializedSigners.push(Keypair.fromSecretKey(new Uint8Array(s.secretKey)));
  });
  return deserializedSigners;
}

export function serializeInstructionsAndSigners(
  transactions: instructionsAndSigners[],
): serializedInstructionsAndSigners[] {
  const serializedTransactions: serializedInstructionsAndSigners[] = [];
  transactions.forEach((transaction) => {
    serializedTransactions.push({
      instructions: serializeInstructions(transaction.instructions),
      signers: serializeSigners(transaction.signers),
    });
  });
  return serializedTransactions;
}

export function deserializeInstructionsAndSigners(
  transactions: serializedInstructionsAndSigners[],
): instructionsAndSigners[] {
  const deserializedTransactions: instructionsAndSigners[] = [];
  transactions.forEach((transaction) => {
    deserializedTransactions.push({
      instructions: deserializeInstructions(transaction.instructions),
      signers: deserializeSigners(transaction.signers),
    });
  });
  return deserializedTransactions;
}
