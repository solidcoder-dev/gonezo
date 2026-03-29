function arrayBufferToBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary);
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  const maybeArrayBuffer = (file as File & { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer;
  if (typeof maybeArrayBuffer === 'function') {
    return maybeArrayBuffer.call(file);
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Cannot read selected file.'));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('Cannot read selected file.'));
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function readMobillsFileAsBase64(file: File): Promise<string> {
  const buffer = await readFileAsArrayBuffer(file);
  return arrayBufferToBase64(buffer);
}
