import winston from 'winston';
import { Action, Builder, Protocol } from '../src';
import { loadKeypairSync } from './util';

const ownerKp = loadKeypairSync(process.env.KEYPAIR_PATH as string);

async function play() {
  const builder = new Builder({
    ownerPubkey: ownerKp.publicKey,
    connectionUrl: 'https://solana-api.projectserum.com',
    committment: 'processed',
  });
  // buy 1 MNGO for 0.3 USDC
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
  // settle Serum market (see docs if unclear why)
  builder.addBrick({
    protocol: Protocol.Serum,
    action: Action.Serum.SettleMarket,
    args: {
      marketPubkey: '3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc',
    },
  });
  // deposit the just acquired 1 MNGO token into Mango
  builder.addBrick({
    protocol: Protocol.Mango,
    action: Action.Mango.Deposit,
    args: {
      mintPubkey: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
      quantity: '1',
      mangoAccountNumber: '0',
    },
  });
  // sell 1 MNGO back for USDC
  builder.addBrick({
    protocol: Protocol.Mango,
    action: Action.Mango.PlaceSpotOrder,
    args: {
      marketPubkey: '3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc',
      side: 'sell',
      price: '0.2',
      size: '1',
      orderType: 'limit',
      mangoAccountNumber: '0',
    },
  });
  // withdraw from MNGO
  builder.addBrick({
    protocol: Protocol.Mango,
    action: Action.Mango.Withdraw,
    args: {
      mintPubkey: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      quantity: '0.2',
      isBorrow: false,
      mangoAccountNumber: '0',
    },
  });
  await builder.build({
    keypair: ownerKp,
  });
  winston.info('All done (using keypair).');
}

play();
