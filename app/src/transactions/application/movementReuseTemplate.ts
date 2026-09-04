import type { ComposerMode } from './transactions.types';
import type { ShareDraft } from '../../sharing/domain/shareDraft';

export type MovementReuseTemplateSource = {
  title: string;
  accountId: string;
  type: Exclude<ComposerMode, 'picker'>;
  categoryId?: string;
  tagNames?: string[];
  items?: Array<{ name: string }>;
  sharing?: {
    people: Array<{
      id: string;
      name: string;
      email?: string;
      reimbursable: boolean;
      parts?: number;
    }>;
  };
  targetAccountId?: string;
  ignored?: boolean;
};

export type MovementReuseTemplate = {
  note: string;
  accountId: string;
  mode: Exclude<ComposerMode, 'picker'>;
  categoryId?: string;
  tagNames: string[];
  splitItems: Array<{ name: string; amount: '' }>;
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
    splitItems: (source.items ?? []).map((item) => ({ name: item.name, amount: '' })),
    shareDraft: source.sharing
      ? {
        mode: 'parts',
        people: source.sharing.people.map((person, index) => ({
          id: person.id,
          name: person.name,
          email: person.email,
          reimbursable: person.reimbursable,
          parts: person.parts ?? 1,
          amount: '',
          avatarTone: avatarToneFor(index),
        })),
      }
      : undefined,
    transferTargetAccountId: source.targetAccountId,
    movementIgnored: source.ignored,
  };
}
