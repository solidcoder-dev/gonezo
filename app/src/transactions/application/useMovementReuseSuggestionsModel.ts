import { useEffect, useRef, useState } from 'react';
import type {
  MovementReuseSuggestionGroup,
  MovementReuseSuggestionsPort,
  MovementReuseSuggestionVariant,
} from '../../movements/application/movementReuseSuggestions.port';

type MovementReuseSuggestionsModelInput = {
  port: MovementReuseSuggestionsPort;
  accountIds: string[];
  enabled: boolean;
  onSelected?: (variant: MovementReuseSuggestionVariant, title?: string) => void;
};

export function useMovementReuseSuggestionsModel(input: MovementReuseSuggestionsModelInput) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<MovementReuseSuggestionGroup[]>([]);
  const [expandedTitle, setExpandedTitle] = useState<string | null>(null);
  const [variants, setVariants] = useState<MovementReuseSuggestionVariant[]>([]);
  const [error, setError] = useState('');
  const [loadedTitle, setLoadedTitle] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const inputRef = useRef(input);
  const accountScopeKey = input.accountIds.join('\u0000');
  inputRef.current = input;

  useEffect(() => {
    const normalizedQuery = query.trim();
    setExpandedTitle(null);
    setVariants([]);
    setLoadedTitle(null);
    if (!input.enabled || normalizedQuery.length < 2) {
      setOpen(false);
      setGroups([]);
      setLoading(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError('');
    const version = ++requestVersion.current;
    const timer = setTimeout(() => {
      void inputRef.current.port.movementReuseSearchGroups({
        query: normalizedQuery,
        accountIds: inputRef.current.accountIds,
        limit: 5,
      }).then((result) => {
        if (version !== requestVersion.current) return;
        setGroups(result.groups);
      }).catch(() => {
        if (version !== requestVersion.current) return;
        setError('Suggestions unavailable');
        setGroups([]);
      }).finally(() => {
        if (version === requestVersion.current) setLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [accountScopeKey, input.enabled, input.port, query]);

  function changeQuery(value: string) {
    setQuery(value);
    setOpen(value.trim().length >= 2);
  }

  function close() {
    requestVersion.current += 1;
    setOpen(false);
    setExpandedTitle(null);
    setVariants([]);
  }

  async function toggleGroup(group: MovementReuseSuggestionGroup) {
    if (group.variantCount <= 1) {
      inputRef.current.onSelected?.(group.primaryVariant, group.title);
      close();
      return;
    }
    if (expandedTitle === group.normalizedTitle) {
      setExpandedTitle(null);
      setVariants([]);
      return;
    }
    setExpandedTitle(group.normalizedTitle);
    if (loadedTitle === group.normalizedTitle) return;
    setLoading(true);
    setError('');
    try {
      const result = await inputRef.current.port.movementReuseListVariants({
        normalizedTitle: group.normalizedTitle,
        accountIds: inputRef.current.accountIds,
      });
      setVariants(result.variants.filter((variant) => variant.representativeMovementId !== group.primaryVariant.representativeMovementId));
      setLoadedTitle(group.normalizedTitle);
    } catch {
      setError('Unable to load variants');
    } finally {
      setLoading(false);
    }
  }

  function selectVariant(variant: MovementReuseSuggestionVariant) {
    inputRef.current.onSelected?.(variant, expandedTitle ?? undefined);
    close();
  }

  return {
    state: { query, open, loading, groups, expandedTitle, variants, error },
    actions: { changeQuery, close, toggleGroup, selectVariant },
  };
}
