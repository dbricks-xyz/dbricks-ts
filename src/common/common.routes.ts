import axios from 'axios';

export async function getMintName(mintPubkey: string, baseURL: string): Promise<string | undefined> {
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
