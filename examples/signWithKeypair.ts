import { Keypair, Transaction } from '@solana/web3.js';
import fs from 'fs';
import winston from 'winston';
import { Action, Builder, Protocol } from '../src';

export function loadKeypairSync(path: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

const ownerKp = loadKeypairSync(process.env.KEYPAIR_PATH as string);

async function sign(tx: Transaction, test1: string, test2: string): Promise<Transaction> {
  tx.sign(ownerKp);
  // todo winston.debug
  console.log(`Transaction signed! ${test1} ${test2}`);
  return tx;
}

async function play() {
  const builder = new Builder({
    ownerPubkey: ownerKp.publicKey,
    connectionUrl: 'https://solana-api.projectserum.com',
  });
  builder.addBrick({
    protocol: Protocol.Serum,
    action: Action.Serum.PlaceOrder,
    args: {
      marketPubkey: '3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc',
      side: 'buy',
      price: '0.5',
      size: '1',
      orderType: 'limit',
    },
  });
  builder.addBrick({
    protocol: Protocol.Serum,
    action: Action.Serum.PlaceOrder,
    args: {
      marketPubkey: '3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc',
      side: 'buy',
      price: '0.1',
      size: '1',
      orderType: 'ioc',
    },
  });
  builder.addBrick({
    protocol: Protocol.Serum,
    action: Action.Serum.SettleMarket,
    args: {
      marketPubkey: '3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc',
    },
  });
  await builder.build(sign, ['hello', 'world']);
  winston.info('All done.');
}

play();
