export type BackupSectionId = 'taxonomy' | 'ledger' | 'recurrence' | 'expected' | 'sharing' | 'analytics' | 'preferences';

export const BACKUP_SECTION_DEPENDENCIES: Record<BackupSectionId, readonly BackupSectionId[]> = {
  taxonomy: [],
  ledger: ['taxonomy'],
  recurrence: ['taxonomy', 'ledger'],
  expected: ['taxonomy', 'ledger', 'recurrence'],
  sharing: ['ledger', 'expected', 'recurrence'],
  analytics: ['ledger', 'expected', 'sharing'],
  preferences: ['ledger'],
};

export function resolveBackupSectionOrder(
  dependencies: Record<BackupSectionId, readonly BackupSectionId[]> = BACKUP_SECTION_DEPENDENCIES,
): BackupSectionId[] {
  const visiting = new Set<BackupSectionId>();
  const visited = new Set<BackupSectionId>();
  const result: BackupSectionId[] = [];

  const visit = (section: BackupSectionId): void => {
    if (visited.has(section)) return;
    if (visiting.has(section)) throw new Error(`Backup section dependency cycle at ${section}`);
    visiting.add(section);
    for (const dependency of dependencies[section] ?? []) visit(dependency);
    visiting.delete(section);
    visited.add(section);
    result.push(section);
  };

  (Object.keys(dependencies) as BackupSectionId[]).sort().forEach(visit);
  return result;
}
