import type { FormEvent } from 'react';

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function resolveSubmitExpectedIntent(event: FormEvent, fallback: boolean): boolean {
  const nativeEvent = event.nativeEvent;
  const submitter = nativeEvent && 'submitter' in nativeEvent
    ? (nativeEvent as Event & { submitter?: EventTarget | null }).submitter
    : undefined;
  if (
    typeof HTMLButtonElement !== 'undefined'
    && submitter instanceof HTMLButtonElement
    && submitter.name === 'transactionIntent'
  ) {
    return submitter.value === 'expected';
  }
  return fallback;
}
