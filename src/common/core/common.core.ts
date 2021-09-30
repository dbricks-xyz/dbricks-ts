import {
  Commitment, Connection, PublicKey, Transaction,
} from '@solana/web3.js';
import axios, { AxiosPromise } from 'axios';
import { deserializeInstructionsAndSigners } from '../common.serializers';
import {
  configuredBrick, fetchedBrick, flattenedBrick, sizedBrick,
} from '../types/common.types';

export class DBricksSDK {
  connectionUrl: string;

  connection: Connection;

  constructor(connectionUrl: string, committment: Commitment) {
    this.connectionUrl = connectionUrl;
    this.connection = new Connection(connectionUrl, committment);
    console.log('Initialized dbricks SDK');
  }

  async fetchBricksFromServer(
    baseURL: string,
    configuredBricks: configuredBrick[],
    ownerPubkey: PublicKey,
  ): Promise<fetchedBrick[]> {
    const fetchedBricks: fetchedBrick[] = [];
    const requests: AxiosPromise[] = [];
    configuredBricks.forEach((b) => {
      b.request.forEach((r) => {
        const request = axios({
          baseURL,
          method: r.method,
          url: r.path,
          data: {
            ...r.payload,
            ownerPubkey: ownerPubkey.toBase58(),
          },
        });
        requests.push(request);
        fetchedBricks.push({
          id: b.id,
          description: b.description,
          instructionsAndSigners: [],
        });
      });
    });
    const responses = await axios.all(requests);

    for (let i = 0; i < responses.length; i += 1) {
      fetchedBricks[i].instructionsAndSigners = deserializeInstructionsAndSigners(
        responses[i].data,
      );
    }
    console.log('Fetched bricks from server:', fetchedBricks);
    return fetchedBricks;
  }

  // in the future could try add dedup logic - just need to be careful
  // eg user might have 3 "place order" instructions - we don't want to dedup to 1
  flattenBricks(fetchedBricks: fetchedBrick[]): flattenedBrick[] {
    const flattenedBricks: flattenedBrick[] = [];
    fetchedBricks.forEach((b) => {
      b.instructionsAndSigners.forEach((i) => {
        if (i.instructions.length > 0) {
          flattenedBricks.push({
            id: b.id,
            description: b.description,
            instructionsAndSigners: i,
          });
        }
      });
    });
    console.log('Flattened bricks', flattenedBricks);
    return flattenedBricks;
  }

  async findOptimalBrickSize(bricks: flattenedBrick[], feePayer: PublicKey): Promise<sizedBrick[]> {
    console.log(`Attempting transaction with ${bricks.length} bricks`);
    const attemptedBrick: sizedBrick = {
      id: 0,
      description: '',
      transaction: new Transaction(),
      signers: [],
    };
    bricks.forEach((i) => {
      attemptedBrick.id = i.id;
      attemptedBrick.description = i.description;
      attemptedBrick.transaction.add(...i.instructionsAndSigners.instructions);
      attemptedBrick.signers.push(...i.instructionsAndSigners.signers);
    });
    attemptedBrick.transaction.recentBlockhash = (await this.connection.getRecentBlockhash())
      .blockhash;
    attemptedBrick.transaction.feePayer = feePayer;
    try {
      const buf = attemptedBrick.transaction.serialize({
        verifySignatures: false,
      });
      console.log(`Transaction of size ${buf.length} fits ${bricks.length} bricks just ok`);
      return [attemptedBrick];
    } catch (e) {
      const middle = Math.ceil(bricks.length / 2);
      console.log(`Transaction with ${bricks.length} bricks is too large, breaking into 2 at ${middle}`);
      const left = bricks.splice(0, middle);
      const right = bricks.splice(-middle);
      return [
        ...(await this.findOptimalBrickSize(left, feePayer)),
        ...(await this.findOptimalBrickSize(right, feePayer)),
      ];
    }
  }

  stringifySizedBrick(brick: sizedBrick): string {
    let result = '';
    brick.transaction.instructions.forEach((instruction) => {
      result += instruction.data.toString();
    });
    result += brick.transaction.recentBlockhash;
    return result;
  }

  timeout(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // if the exact same transaction has been executed before, we need to update the blockhash
  // otherwise it will fail with "This transaction has already been processed"
  async updateBlockhashOnSimilarTransactions(sizedBricks: sizedBrick[]): Promise<sizedBrick[]> {
    const sizedBricksCopy = [...sizedBricks];
    const stringifiedBricks: string[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const brick of sizedBricksCopy) {
      while (brick.transaction.recentBlockhash
      && stringifiedBricks.indexOf(this.stringifySizedBrick(brick)) !== -1) {
        /* eslint-disable no-await-in-loop */
        await this.timeout(2000);
        brick.transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;
        /* eslint-enable no-await-in-loop */
      }
      stringifiedBricks.push(this.stringifySizedBrick(brick));
    }
    return sizedBricksCopy;
  }

  async getMintName(mintPubkey: string, baseURL: string): Promise<string | undefined> {
    const response = await axios({
      baseURL,
      method: 'POST',
      url: '/mintname',
      data: {
        mintPubkey,
      },
    });
    return response.data;
  }
}
