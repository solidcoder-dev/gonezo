import { useMemo, useState } from 'react';
import type { TaxonomyTagItem } from './taxonomy.port';

function normalizeTaxonomyName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function useTagSelectionModel(tags: TaxonomyTagItem[]) {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const options = useMemo(() => tags
    .filter((tag) => tag.status === 'active')
    .map((tag) => ({ id: tag.id, name: tag.name }))
    .sort((left, right) => left.name.localeCompare(right.name)), [tags]);
  const selectedOptions = useMemo(() => selectedNames.map((name) => {
    const existing = options.find((tag) => normalizeTaxonomyName(tag.name) === normalizeTaxonomyName(name));
    return existing ?? { id: `new:${normalizeTaxonomyName(name)}`, name };
  }), [options, selectedNames]);
  const normalizedSelected = useMemo(() => new Set(selectedNames.map(normalizeTaxonomyName)), [selectedNames]);
  const normalizedQuery = normalizeTaxonomyName(query);
  const suggestions = useMemo(() => normalizedQuery
    ? options.filter((tag) => !normalizedSelected.has(normalizeTaxonomyName(tag.name)) && normalizeTaxonomyName(tag.name).includes(normalizedQuery))
    : [], [normalizedQuery, normalizedSelected, options]);
  const createCandidate = query.trim()
    && !options.some((tag) => normalizeTaxonomyName(tag.name) === normalizedQuery)
    && !normalizedSelected.has(normalizedQuery) ? query.trim() : undefined;

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const normalized = normalizeTaxonomyName(trimmed);
    setSelectedNames((previous) => previous.some((item) => normalizeTaxonomyName(item) === normalized) ? previous : [...previous, trimmed]);
    setQuery('');
  }

  function select(id: string) {
    const tag = options.find((item) => item.id === id);
    if (tag) add(tag.name);
  }

  function remove(id: string) {
    const newName = id.startsWith('new:') ? id.slice(4) : undefined;
    setSelectedNames((previous) => previous.filter((name) => {
      const existing = options.find((tag) => normalizeTaxonomyName(tag.name) === normalizeTaxonomyName(name));
      return existing ? existing.id !== id : normalizeTaxonomyName(name) !== newName;
    }));
  }

  return {
    state: { selectedNames, query, selectedOptions, suggestions, createCandidate, options },
    actions: {
      reset: () => { setSelectedNames([]); setQuery(''); },
      prefill: (names: string[]) => { setSelectedNames([...names]); setQuery(''); },
      setQuery,
      select,
      add,
      remove,
      removeLast: () => setSelectedNames((previous) => previous.slice(0, -1)),
    },
  };
}
