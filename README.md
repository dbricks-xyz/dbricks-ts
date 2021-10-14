# dbricks-ts

## Introduction

**dbricks-ts** is a Typescript SDK for dbricks.xyz.

dbricks.xyz helps developers compose protocols bulit on top of Solana blockchain
like lego bricks.

dbricks [REST API](https://dbricks.dev/) has routes for a number of meaningful
protocols, including Serum, Mango, Saber, and others. The routes are
standartized, all returning an array
of [instructions](https://docs.solana.com/developing/programming-model/transactions#instructions)
and [signers](https://docs.solana.com/developing/programming-model/accounts#signers)
. The only thing left to do is to add the owner's signature and fire off the
transaction to Solana.

This is where the SDK comes in. With the SDK you don't need to worry about how
signing works and what the correct methods to call are.

Just follow the below steps:

```ts
// instantiate the Builder class
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

// deposit the just acquired 1 MNGO token into Mango Markets
builder.addBrick({
  protocol: Protocol.Mango,
  action: Action.Mango.Deposit,
  args: {
    mintPubkey: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
    quantity: '1',
    mangoAccountNumber: '0',
  },
});

// sell 1 MNGO back to USDC
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

// withdraw USDC from Mango Markets
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

// fire off the transaction to Solana
await builder.build({
  keypair: ownerKp,
});
```

And just like that you now have less USDC than you started with! How awesome is
that:)

On a more serious note, we think dbricks is powerful because:

- it saves you from having to learn rust/solana in great detail
- it exposes a standartized interfaces to all protocols
- it lets you combine instructions to various protocols into a single
  transaction (where possible, limited by transaction size)
- it automatically splits transactions for you when they're too large

Below we dive deeper into some of the more specific features of the SDK.

## Transaction splitting

Solana caps transaction size at 1232 bytes. This means sometimes, especially
when attempting multi-protocol operations, all the instructions won't fit into a
single transaction. To solve the issue our SDK recursively splits the
transaction until it arrives at a minimum set of maximally sized transactions.

Currently the code that does that is relatively naive, splitting the transaction
down the middle. This will be optimized in the future.

## Transaction signing

Before the transaction is sent to Solana's runtime for processing it needs to be
signed.

The main signer of the transaction is the owner Keypair, which is done
client-side. There are 3 ways to sign & send the transaction:

1. Using a loaded Keypair (ideal for backends)

```ts
function loadKeypairSync(path: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

const ownerKp = loadKeypairSync(process.env.KEYPAIR_PATH as string);

//... instantiate and compose the builder as needed ...

await builder.build({
  keypair: ownerKp,
});
```

2. Using Solana's
   official [Wallet Adapter](https://github.com/solana-labs/wallet-adapter) (
   ideal for frontends)

```ts
const wallet = getPhantomWallet();
const connectedAdapter = wallet.adapter();
await connectedAdapter.connect();

//... instantiate and compose the builder as needed ...

await builder.build({
  connectedAdapter: connectedAdapter,
});
```

3. Using a callback (all other usecases)

```ts
function loadKeypairSync(path: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

const ownerKp = loadKeypairSync(process.env.KEYPAIR_PATH as string);

async function sign(tx: Transaction): Promise<Transaction> {
  tx.sign(ownerKp);
  winston.debug('Transaction signed!');
  return tx;
}

//... instantiate and compose the builder as needed ...

await builder.build({
  signCallback: sign,
});
```

Note that all of the above methods automatically include additional signers,
which are returned by dbricks server.
