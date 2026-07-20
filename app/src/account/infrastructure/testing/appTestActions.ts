import { fireEvent, screen, within } from '@testing-library/react';

export type ComposerMovementMode = 'Expense' | 'Income' | 'Transfer';

export async function openMode(mode: ComposerMovementMode) {
  fireEvent.click(screen.getByRole('button', { name: 'Add movement' }));
  const composer = await screen.findByRole('dialog', { name: 'Transaction composer' });
  if (mode !== 'Expense') {
    await selectComposerMovementType(composer, mode);
  }
}

export async function selectComposerMovementType(composer: HTMLElement, mode: ComposerMovementMode) {
  fireEvent.click(within(composer).getByRole('button', { name: /^Movement type/ }));
  fireEvent.click(await screen.findByRole('button', { name: `Select movement type ${mode}` }));
}

export async function selectComposerSourceAccount(composer: HTMLElement, accountName: string) {
  fireEvent.click(within(composer).getByRole('button', { name: /^Source account/ }));
  fireEvent.click(await screen.findByRole('button', { name: `Select account ${accountName}` }));
}

export async function openNewItemDialog() {
  await screen.findByLabelText('Description');
}

export async function openItemsEditor() {
  fireEvent.click(await screen.findByRole('button', { name: 'Items' }));
}

export function scheduleButton(name: RegExp | string) {
  return within(screen.getByRole('dialog', { name: 'Recurring schedule' })).getByRole('button', { name });
}

export function applySchedule() {
  fireEvent.click(scheduleButton('Apply schedule'));
}

export function selectMonthlyScheduleEveryTwoMonthsOnDay11() {
  const repeat = scheduleButton(/Repeat:/);
  if (!repeat.textContent?.includes('Monthly')) {
    fireEvent.click(repeat);
    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
  }

  fireEvent.click(scheduleButton(/Every:/));
  fireEvent.click(screen.getByRole('button', { name: '2 months' }));

  fireEvent.click(scheduleButton(/On:/));
  fireEvent.click(screen.getByRole('button', { name: /Day:/ }));
  fireEvent.click(screen.getByRole('button', { name: '11' }));
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
}

export async function expandExpectedMovements() {
  await goToMovementsPage();
  fireEvent.click(await screen.findByRole('button', { name: /Expand expected movements/i }));
}

export async function expandScheduledMovements() {
  await goToMovementsPage();
  fireEvent.click(await screen.findByRole('button', { name: /Expand scheduled movements/i }));
}

export async function goToMovementsPage() {
  if (!screen.queryByRole('heading', { name: 'Movements' })) {
    fireEvent.click(await screen.findByRole('button', { name: 'Movements' }));
  }
  await screen.findByRole('heading', { name: 'Movements' });
}

export async function openImportSheetFromAccounts() {
  fireEvent.click(await screen.findByRole('button', { name: 'Profile' }));
  await screen.findByRole('heading', { name: 'Profile' });
  fireEvent.click(screen.getByRole('button', { name: 'Import backup' }));
}

export async function enableMobillsImport() {
  fireEvent.click(await screen.findByLabelText('Import Mobills TSV/CSV'));
}
