import type { MobillsImportPolicy } from '../../../application/imports.port';

export type WebMobillsImportPolicy = {
  createMissingAccounts: boolean;
  createMissingCategories: boolean;
  createMissingTags: boolean;
  duplicatePolicy: 'skip' | 'fail' | 'import_anyway';
};

export function normalizeWebMobillsImportPolicy(
  policy?: MobillsImportPolicy,
): WebMobillsImportPolicy {
  return {
    createMissingAccounts: policy?.createMissingAccounts === true,
    createMissingCategories: policy?.createMissingCategories !== false,
    createMissingTags: policy?.createMissingTags !== false,
    duplicatePolicy: policy?.duplicatePolicy ?? 'skip',
  };
}
