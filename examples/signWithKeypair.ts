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
  builder.addBrick({
    protocol: Protocol.Serum,
    action: Action.Serum.SettleMarket,
    args: {
      marketPubkey: '3d4rzwpy9iGdCZvgxcu7B1YocYffVLsQXPXkBZKt2zLc',
    },
  });
  await builder.build({
    keypair: ownerKp,
  });
  winston.info('All done (using keypair).');
}

play();
