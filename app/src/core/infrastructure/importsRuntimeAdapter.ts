import type {
  MobillsImportInput,
  MobillsImportResult,
  MovementsBackupExportResult,
  MovementsBackupImportInput,
  MovementsBackupImportResult,
} from '../../imports/application/imports.port';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class ImportsRuntimeAdapter {
  private readonly web: CoreAdapterWeb;

  constructor(web: CoreAdapterWeb) {
    this.web = web;
  }

  mobillsImport(input: MobillsImportInput): Promise<MobillsImportResult> {
    return isNativeRuntime() ? CorePlugin.mobillsImport(input) : this.web.mobillsImport(input);
  }

  movementsExportBackup(): Promise<MovementsBackupExportResult> {
    return isNativeRuntime() ? CorePlugin.movementsExportBackup() : this.web.movementsExportBackup();
  }

  movementsImportBackup(input: MovementsBackupImportInput): Promise<MovementsBackupImportResult> {
    return isNativeRuntime() ? CorePlugin.movementsImportBackup(input) : this.web.movementsImportBackup(input);
  }
}
