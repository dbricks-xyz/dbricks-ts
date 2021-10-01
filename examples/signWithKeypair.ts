import { Keypair, Transaction } from '@solana/web3.js';
import fs from 'fs';
import { Action, Builder, Protocol } from '../src';

require('dotenv').config();

export function loadKeypairSync(path: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

const ownerKp = loadKeypairSync(process.env.KEYPAIR_PATH as string);

// option 1 - sign with keypair
function sign(tx: Transaction) {
  tx.sign(ownerKp);
  return tx;
}

// // option 2 - sign with wallet
// // NOTE: commenting out as the Wallet package is not installed here, but it's this one -
// // https://www.npmjs.com/package/@project-serum/sol-wallet-adapter
// function signWallet(tx: Transaction) {
//   const wallet = new Wallet('https://www.sollet.io', 'https://api.mainnet-beta.solana.com');
//   wallet.on('connect', (ownerPubkey: PublicKey) => {
//     console.log(`Wallet connected to ${ownerPubkey.toBase58()}.`);
//   });
//   wallet.on('Disconnect', () => {
//     console.log('Wallet disconnected.');
//   });
//   await wallet.connect();
//   return wallet.signTransaction(tx);
// }

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
  // builder.addBrick({
  //   protocol: Protocol.Serum,
  //   action: SerumAction.PlaceOrder,
  //   args: {
  //     marketPubkey: '3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc',
  //     side: 'buy',
  //     price: '0.4',
  //     size: '1',
  //     orderType: 'limit',
  //   },
  // });
  await builder.build(sign);
}

play();
