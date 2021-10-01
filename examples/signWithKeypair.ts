import { Keypair, Transaction } from '@solana/web3.js';
import fs from 'fs';
import winston from 'winston';
import { Action, Builder, Protocol } from '../src';

export function loadKeypairSync(path: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

const ownerKp = loadKeypairSync(process.env.KEYPAIR_PATH as string);

function sign(tx: Transaction) {
  tx.sign(ownerKp);
  return tx;
}

async function play() {
  const builder = new Builder({
    ownerPubkey: ownerKp.publicKey,
  });
  builder.addBrick({
    protocol: Protocol.Serum,
    action: Action.Serum.PlaceOrder,
    args: {
      marketPubkey: '3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc',
      side: 'buy',
      price: '0.3',
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
  await builder.build(sign);
  winston.info('All done.');
}

play();
