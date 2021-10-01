// https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
export async function asyncTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
