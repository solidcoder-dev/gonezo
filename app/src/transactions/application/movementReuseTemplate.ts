import type { ComposerMode } from './transactions.types';
import type { ShareDraft } from '../../sharing/domain/shareDraft';

export type MovementReuseTemplateSource = {
  title: string;
  accountId: string;
  type: Exclude<ComposerMode, 'picker'>;
  categoryId?: string;
  tagNames?: string[];
  items?: Array<{ name: string; amount?: string }>;
  sharing?: {
    people: Array<{
      id: string;
      name: string;
      email?: string;
      reimbursable: boolean;
      parts?: number;
      amount?: string;
    }>;
  };
  targetAccountId?: string;
  ignored?: boolean;
  amount?: string;
};

export type MovementReuseTemplate = {
  note: string;
  accountId: string;
  mode: Exclude<ComposerMode, 'picker'>;
  categoryId?: string;
  tagNames: string[];
  splitItems: Array<{ name: string; amount: string }>;
  amount?: string;
  shareDraft?: ShareDraft;
  transferTargetAccountId?: string;
  movementIgnored?: boolean;
};

function avatarToneFor(index: number): ShareDraft['people'][number]['avatarTone'] {
  return index === 0 ? 'you' : 'custom';
}

export function createMovementReuseTemplate(source: MovementReuseTemplateSource): MovementReuseTemplate {
  return {
    note: source.title.trim(),
    accountId: source.accountId,
    mode: source.type,
    categoryId: source.categoryId,
    tagNames: [...(source.tagNames ?? [])],
    amount: source.amount,
    splitItems: (source.items ?? []).map((item) => ({ name: item.name, amount: item.amount ?? '' })),
    shareDraft: source.sharing
      ? {
        mode: source.sharing.people.some((person) => person.amount != null) ? 'amounts' : 'parts',
        people: source.sharing.people.map((person, index) => ({
          id: person.id,
          name: person.name,
          email: person.email,
          reimbursable: person.reimbursable,
          parts: person.parts ?? 1,
          amount: person.amount ?? '',
          avatarTone: avatarToneFor(index),
        })),
      }
      : undefined,
    transferTargetAccountId: source.targetAccountId,
    movementIgnored: source.ignored,
  };
}
