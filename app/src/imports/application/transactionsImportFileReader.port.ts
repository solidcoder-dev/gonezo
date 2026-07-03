export type TransactionsImportFileReaderPort = {
  readAsBase64(file: File): Promise<string>;
};
