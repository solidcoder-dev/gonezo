import { resolve } from 'node:path';
import { collectStyleSources, findInvalidVarUsages, findLegacyPrimitiveUsages, findProhibitedClassUsages } from './style-policy.mjs';

const root = resolve(import.meta.dirname, '..', 'src');
const allowedThemeFiles = new Set(['styles/bootstrap.scss', 'styles/_gonezo-tokens.scss', 'styles/_theme-colors.generated.scss']);
const allowedGlobalStyles = new Set(['index.css', 'App.css', 'shared/ui/primitives.css']);
// Transitional allowlist: these pre-existing files are migrated one bounded context at a time.
// The checker still rejects every new global feature stylesheet.
const legacyGlobalStyles = new Set([
  'account/application/AccountSummary/AccountSummaryComponent.css', 'account/ui/AccountSwitcher/AccountSwitcherView.css',
  'imports/ui/TransactionsImportView.css', 'movements/ui/MonthNavigator/MonthNavigatorView.css',
  'movements/ui/MonthPickerModal/MonthPickerModalView.css', 'movements/ui/MonthlyMovements/MonthlyMovementsView.css',
  'movements/ui/MovementDetail/MovementDetailView.css', 'movements/ui/MovementSection/MovementSectionView.css',
  'movements/ui/MovementsSearch/MovementsSearch.css', 'movements/ui/YearMonthSelector/YearMonthSelectorView.css',
  'movements/ui/movements.css',
  'shared/ui/BottomNavigation/BottomNavigationView.css', 'shared/ui/FloatingActionButton/FloatingActionButtonView.css',
  'shared/ui/MultiTagPicker/MultiTagPickerView.css', 'shared/ui/SelectChip/SelectChipView.css',
  'shared/ui/SplitFloatingAction/SplitFloatingActionView.css', 'shared/ui/detailSheet.css',
  'transactions/ui/CategoryPickerField/CategoryPickerField.css', 'transactions/ui/ComposerModePicker/ComposerModePickerView.css',
  'transactions/ui/ExperimentalMovementDockNavigation/ExperimentalMovementDockNavigationView.css',
  'transactions/ui/ItemBreakdownControls/ItemBreakdownControlsView.css', 'transactions/ui/MovementAccountSelector/MovementAccountSelectorView.css',
  'transactions/ui/MovementDraftPicker/MovementDraftPickerView.css', 'transactions/ui/MovementMoreControls/MovementMoreControlsView.css',
  'transactions/ui/MovementTypeSelector/MovementTypeSelectorView.css', 'transactions/ui/MovementVoiceEntry/MovementVoiceEntryView.css',
  'transactions/ui/MovementVoiceEntry/MovementVoicePermissionDialog.css', 'transactions/ui/RecurrenceEditor/RecurrenceEditorView.css',
  'transactions/ui/ScheduleControls/ScheduleControlsView.css', 'transactions/ui/TransactionComposer/TransactionComposerView.css',
  'transactions/ui/TransactionComposerActions/TransactionComposerActionsView.css', 'transactions/ui/TransactionMainFields/TransactionMainFieldsView.css',
]);
const LEGACY_GLOBAL_STYLE_LIMIT = legacyGlobalStyles.size;
const boundedContexts = new Set(['account', 'analytics', 'expected', 'imports', 'ledger', 'movements', 'scheduling', 'sharing', 'taxonomy', 'transactions', 'workspace']);
function fail(message) {
  console.error(`check:styles failed: ${message}`);
  process.exitCode = 1;
}

const sources = (await collectStyleSources(root)).map(({ relativePath, text }) => [relativePath, text]);
const cssSources = sources.filter(([path]) => /\.(css|scss)$/.test(path));
const allText = sources.map(([, text]) => text).join('\n');
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');

if (legacyGlobalStyles.size > LEGACY_GLOBAL_STYLE_LIMIT) {
  fail(`La allowlist global legacy aumentó (${legacyGlobalStyles.size} > ${LEGACY_GLOBAL_STYLE_LIMIT}); migra un bounded context o justifica una reducción.`);
}

for (const legacyPath of legacyGlobalStyles) {
  if (!sources.some(([path]) => path === legacyPath)) fail(`La allowlist legacy incluye un archivo inexistente: ${legacyPath}`);
}

for (const [path, text] of sources) {
  const source = stripComments(text);
  const isTestFile = /\.(?:spec|test)\.[jt]sx?$/.test(path);
  if (isTestFile) continue;
  if (!allowedThemeFiles.has(path) && /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/i.test(source)) {
    fail(`${path}: color directo fuera del tema central`);
  }
  if (/\.(css|scss)$/.test(path)) {
    for (const invalid of findInvalidVarUsages(source)) fail(`${path}: var() inválido: ${invalid}`);
  }
  if (path !== 'shared/testing/stylePolicy.spec.ts') {
    for (const legacy of findProhibitedClassUsages(source)) fail(`${path}: clase global prohibida: ${legacy}`);
  }
  if (!allowedThemeFiles.has(path) && /!important\b/.test(source)) fail(`${path}: !important no está permitido`);
  if (path !== 'shared/testing/stylePolicy.spec.ts') {
    for (const legacy of findLegacyPrimitiveUsages(source, path)) {
      fail(`${path}:${legacy.line}:${legacy.column}: clase primitiva prohibida "${legacy.name}"; usa "${legacy.replacement}"`);
    }
  }
}

const bootstrapImports = sources.flatMap(([path, text]) => {
  if (path === 'main.tsx' && /import\s+['"]\.\/styles\/bootstrap\.scss['"]/.test(text)) return [path];
  if (path === 'styles/bootstrap.scss' && /@import\s+["']bootstrap\/scss\/bootstrap["']/.test(text)) return [path];
  return [];
});
if (bootstrapImports.length !== 2) fail(`Bootstrap debe tener un único punto Sass y un único import runtime; encontrados: ${bootstrapImports.join(', ')}`);
if ((allText.match(/bootstrap\/scss\/bootstrap/g) ?? []).length !== 1) fail('Bootstrap Sass aparece más de una vez.');
if (allText.includes('--gz-legacy-') || /var\(--(?:text|muted|background|surface|primary)\b/.test(allText)) {
  fail('Se encontraron variables heredadas o ambiguas.');
}
if (allText.includes('--color-shadow-rgb') || /rgb\(var\(--color-shadow-rgb/.test(allText)) {
  fail('Las sombras deben usar tokens completos; --color-shadow-rgb ya no está permitido.');
}

const defined = new Set();
for (const [, text] of sources) for (const match of text.matchAll(/--([a-zA-Z0-9_-]+)['"]?\s*:/g)) defined.add(match[1]);
for (const [path, text] of sources) {
  const source = stripComments(text);
  if (/\.(?:spec|test)\.[jt]sx?$/.test(path)) continue;
  if (!allowedThemeFiles.has(path) && /var\(--bs-[a-z0-9-]+\b/i.test(source)) fail(`${path}: consume una variable Bootstrap directamente; usa un token semántico Gonezo`);
  for (const match of source.matchAll(/var\(--([a-zA-Z0-9_-]+)/g)) {
    const name = match[1];
    if (!defined.has(name) && !name.startsWith('bs-')) fail(`${path}: variable CSS no definida --${name}`);
  }
}

for (const [path, text] of cssSources) {
  const source = stripComments(text);
  if (allowedThemeFiles.has(path)) continue;
  if (/(?:^|[\s{;])(#[0-9a-f]{3,8}|rgba?\(\s*\d|hsla?\(\s*\d)/i.test(source)) fail(`${path}: color directo fuera de los archivos de tema`);
  if (!path.endsWith('.module.css') && !allowedGlobalStyles.has(path) && /(?:^|[,{]\s*)\.(?:card|toast|chip|hint|icon-button|text-button|field-error|stack)\b/m.test(text)) fail(`${path}: clase global genérica sin namespace`);
  if (!path.endsWith('.module.css') && path !== 'index.css' && /(?:^|[,{]\s*)(?:button|input|select|textarea)\b/m.test(text)) fail(`${path}: selector global de elemento; usa Bootstrap o una clase del componente`);
  if (/(?:^|[;\s])z-index:\s*\d+\b/m.test(source)) fail(`${path}: z-index directo fuera del sistema de tokens`);
  if (/(?:^|[;\s])font-weight:\s*(?:650|750|850)\b/m.test(source)) fail(`${path}: font-weight numérico fuera de la escala aprobada`);
  if (!allowedThemeFiles.has(path) && !allowedGlobalStyles.has(path) && !legacyGlobalStyles.has(path) && !path.endsWith('.module.css')) fail(`${path}: CSS global de feature no permitido; usa CSS Modules o primitives gz-*`);
}

for (const [path, text] of sources.filter(([candidate]) => /\.(?:ts|tsx|jsx|js)$/.test(candidate))) {
  const importerContext = path.split('/')[0];
  if (!boundedContexts.has(importerContext)) continue;
  for (const match of text.matchAll(/import\s+(?:[^'";]+from\s+)?['"]([^'"]+\.css)['"];?/g)) {
    const imported = match[1];
    const resolvedContext = imported.split('/').find((part) => boundedContexts.has(part));
    if (resolvedContext && resolvedContext !== importerContext && resolvedContext !== 'shared') {
      fail(`${path}: import CSS entre bounded contexts (${imported})`);
    }
  }
}

if (process.exitCode) process.exit(1);
console.log('check:styles passed');
