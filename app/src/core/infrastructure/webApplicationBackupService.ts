import {
  applyWebApplicationBackup,
  exportWebApplicationBackup,
  validateWebApplicationBackup,
} from '../../imports/infrastructure/webApplicationBackup';
import type { WebAppState } from './webAppState';
import type { WebBackupDownloader, WebClock } from './webRuntimeDependencies';

export class WebApplicationBackupService {
  private readonly state: WebAppState;
  private readonly clock: WebClock;
  private readonly backupDownloader: WebBackupDownloader;

  constructor(
    state: WebAppState,
    clock: WebClock,
    backupDownloader: WebBackupDownloader,
  ) {
    this.state = state;
    this.clock = clock;
    this.backupDownloader = backupDownloader;
  }

  exportBackup() {
    const createdAt = this.clock.nowIso();
    const document = exportWebApplicationBackup(this.state, createdAt);
    const json = JSON.stringify(document, null, 2);
    const fileName = `gonezo-application-backup-${createdAt.replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z')}.json`;
    this.backupDownloader.downloadJson(fileName, json);
    return { fileName, createdAt, json };
  }

  importBackup(fileBase64: string): void {
    if (!fileBase64.trim()) throw new Error('fileBase64 is required');
    try {
      const document = validateWebApplicationBackup(JSON.parse(decodeBase64Utf8(fileBase64)));
      applyWebApplicationBackup(this.state, document);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid application backup JSON', { cause: error });
      }
      throw error;
    }
  }
}

export function decodeBase64Utf8(fileBase64: string): string {
  const binary = atob(fileBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
