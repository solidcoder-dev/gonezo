export type WebCoreClock = {
  nowIso(): string;
};

export type WebCoreIdGenerator = {
  nextId(): string;
};

export type WebBackupDownloader = {
  downloadJson(fileName: string, json: string): void;
};

export type CoreAdapterWebDependencies = {
  clock: WebCoreClock;
  idGenerator: WebCoreIdGenerator;
  backupDownloader: WebBackupDownloader;
};

function downloadJsonInBrowser(fileName: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const defaultCoreAdapterWebDependencies: CoreAdapterWebDependencies = {
  clock: {
    nowIso: () => new Date().toISOString(),
  },
  idGenerator: {
    nextId: () => crypto.randomUUID(),
  },
  backupDownloader: {
    downloadJson: downloadJsonInBrowser,
  },
};
