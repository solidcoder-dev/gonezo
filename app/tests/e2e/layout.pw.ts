import { expect, test, type Locator, type Page } from '@playwright/test';

const themes = ['light', 'dark'] as const;
const viewports = [
  { width: 320, height: 700 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 576, height: 900 },
  { width: 768, height: 1024 },
  { width: 992, height: 768 },
  { width: 1200, height: 900 },
];

async function applyTheme(page: Page, theme: (typeof themes)[number]) {
  await page.addInitScript((selectedTheme) => {
    document.documentElement.setAttribute('data-bs-theme', selectedTheme);
  }, theme);
}

async function assertNoHorizontalOverflow(page: Page) {
  const withinBounds = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(withinBounds).toBe(true);
}

async function assertTouchTargets(page: Page) {
  const controls = page.locator('button, input, select, textarea, [role="button"], [role="tab"]');
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    const box = await control.boundingBox();
    if (!box) {
      continue;
    }
    await expect(box.width, `control ${index} is too narrow`).toBeGreaterThanOrEqual(44);
    await expect(box.height, `control ${index} is too short`).toBeGreaterThanOrEqual(44);
  }
}

async function assertVisibleBoxWithinViewport(locator: Locator, viewport: { width: number; height: number }) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x ?? 0).toBeGreaterThanOrEqual(-1);
  expect(box?.y ?? 0).toBeGreaterThanOrEqual(-1);
  expect((box?.width ?? 0)).toBeLessThanOrEqual(viewport.width + 1);
  expect((box?.height ?? 0)).toBeLessThanOrEqual(viewport.height + 1);
}

async function assertSticky(locator: Locator) {
  await expect(locator).toHaveCSS('position', 'sticky');
}

async function openProfileCreateAccountSheet(page: Page) {
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Add account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create account' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openProfileImportBackupSheet(page: Page) {
  await page.getByRole('button', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Import backup' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import backup' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openFirstRecentMovementDetail(page: Page) {
  const recentList = page.getByRole('region', { name: 'Recent movements' }).locator('ul[aria-label="Recent movements list"]');
  await expect(recentList.locator('li')).toHaveCount(1);
  await recentList.getByRole('button').first().click();
  const detail = page.getByRole('dialog', { name: 'Movement detail' });
  await expect(detail).toBeVisible();
  return detail;
}

const seededBackup = {
  schemaVersion: 2,
  exportedAt: '2026-07-29T12:00:00.000Z',
  accounts: [{
    id: 'account-1',
    name: 'Main',
    type: 'cash',
    currency: 'USD',
    status: 'active',
  }],
  categories: [],
  tags: [],
  postedMovements: [{
    id: 'tx-1',
    accountId: 'account-1',
    type: 'expense',
    status: 'posted',
    occurredAt: '2026-07-29T12:00:00.000Z',
    amount: '20.00',
    currency: 'USD',
    description: 'Coffee',
    tagIds: [],
    splitItems: [],
  }],
} as const;

for (const theme of themes) {
  for (const viewport of viewports) {
    test.describe(`${theme} ${viewport.width}px shell`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(viewport);
        await applyTheme(page, theme);
      });

      test('keeps the main routes within bounds and accessible', async ({ page }) => {
        await page.goto('/#/');
        await expect(page.getByRole('heading', { name: 'Gonezo' })).toBeVisible();
        await assertSticky(page.locator('header').first());
        await assertNoHorizontalOverflow(page);
        await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
        await assertTouchTargets(page);

        await page.getByRole('button', { name: 'Analytics' }).click();
        await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
        const analyticsTabs = page.getByRole('tablist', { name: 'Analytics views' });
        await expect(analyticsTabs).toBeVisible();
        await assertSticky(analyticsTabs);
        await page.getByRole('tab', { name: 'Spending' }).click();
        await expect(page.getByRole('heading', { name: 'Top expenses' })).toBeVisible();
        await page.getByRole('tab', { name: 'Flow' }).click();
        await expect(page.getByText('No accounts available for this currency.')).toBeVisible();
        await page.getByRole('tab', { name: 'Overview' }).click();
        await expect(page.getByTestId('overview-tab')).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await assertTouchTargets(page);

        await page.getByRole('button', { name: 'Movements' }).click();
        await expect(page.getByRole('heading', { name: 'Movements' })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await assertTouchTargets(page);

        await page.getByRole('link', { name: 'Search movements' }).click();
        await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await assertTouchTargets(page);

        await assertNoHorizontalOverflow(page);
        await assertTouchTargets(page);
      });
    });
  }
}

for (const theme of themes) {
  for (const viewport of viewports) {
    test.describe(`${theme} ${viewport.width}px profile sheet`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(viewport);
        await applyTheme(page, theme);
      });

      test('opens the create-account sheet from profile and keeps it within bounds', async ({ page }) => {
        await page.goto('/#/');
        const sheet = await openProfileCreateAccountSheet(page);
        await assertVisibleBoxWithinViewport(sheet, viewport);
        await assertNoHorizontalOverflow(page);
        await assertTouchTargets(page);
        await sheet.getByRole('button', { name: 'Close add account sheet' }).click();
        await expect(page.getByRole('dialog', { name: 'Create account' })).toHaveCount(0);
      });
    });
  }
}

for (const theme of themes) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
    test.describe(`${theme} ${viewport.width}px import and detail`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(viewport);
        await applyTheme(page, theme);
      });

      test('imports a backup and opens its detail and secondary sheet', async ({ page }) => {
        await page.goto('/#/');
        const importSheet = await openProfileImportBackupSheet(page);
        await importSheet.getByLabel('Backup file (JSON)').setInputFiles({
          name: `gonezo-backup-${theme}-${viewport.width}.json`,
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(seededBackup)),
        });
        await importSheet.getByRole('button', { name: 'Import backup' }).click();
        await expect(page.getByRole('dialog', { name: 'Import backup' })).toContainText('Imported 1 / 1 rows');
        await page.getByRole('button', { name: 'Close import sheet' }).click();
        await expect(page.getByRole('dialog', { name: 'Import backup' })).toHaveCount(0);

        await page.getByRole('button', { name: 'Home' }).click();
        await expect(page.getByRole('heading', { name: 'Gonezo' })).toBeVisible();

        const detail = await openFirstRecentMovementDetail(page);
        await assertVisibleBoxWithinViewport(detail, viewport);
        await detail.getByRole('button', { name: 'More details' }).click();
        const more = page.getByRole('dialog', { name: 'Movement more' });
        await expect(more).toBeVisible();
        await assertVisibleBoxWithinViewport(more, viewport);
        await page.getByTestId('sheet-backdrop').click({ position: { x: 8, y: 8 } });
        await expect(page.getByRole('dialog', { name: 'Movement more' })).toHaveCount(0);
        await expect(page.getByRole('dialog', { name: 'Movement detail' })).toBeVisible();
        await assertNoHorizontalOverflow(page);
        await assertTouchTargets(page);
      });
    });
  }
}
