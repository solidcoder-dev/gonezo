import { readMobillsFileAsBase64 } from './providers/mobills/mobillsFileReader';

export async function readImportFileAsBase64(file: File): Promise<string> {
  return readMobillsFileAsBase64(file);
}
