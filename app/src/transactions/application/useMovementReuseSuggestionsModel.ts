import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MovementReuseSuggestionGroup,
  MovementReuseSuggestionsPort,
  MovementReuseSuggestionVariant,
} from '../../movements/application/movementReuseSuggestions.port';

type MovementReuseSuggestionsModelInput = {
  port: MovementReuseSuggestionsPort;
  accountIds: string[];
  query: string;
  enabled: boolean;
  onSelected?: (selection: { title: string; variant: MovementReuseSuggestionVariant }) => void;
};

export function useMovementReuseSuggestionsModel(input: MovementReuseSuggestionsModelInput) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<MovementReuseSuggestionGroup[]>([]);
  const [expandedTitle, setExpandedTitle] = useState<string | null>(null);
  const [variants, setVariants] = useState<MovementReuseSuggestionVariant[]>([]);
  const [error, setError] = useState('');
  const [loadedTitle, setLoadedTitle] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(input.enabled);
  const requestVersion = useRef(0);
  const sessionVersion = useRef(0);
  const inputRef = useRef(input);
  const accountScopeKey = input.accountIds.join('\u0000');
  inputRef.current = input;

  useEffect(() => {
    const normalizedQuery = input.query.trim();
    const version = ++requestVersion.current;
    setExpandedTitle(null);
    setVariants([]);
    setLoadedTitle(null);
    if (!input.enabled || !sessionActive || normalizedQuery.length < 2) {
      setOpen(false);
      setGroups([]);
      setLoading(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError('');
    const activeSession = sessionVersion.current;
    const query = normalizedQuery;
    const accountIds = [...inputRef.current.accountIds];
    const timer = setTimeout(() => {
      void inputRef.current.port.movementReuseSearchGroups({
        query,
        accountIds,
        limit: 5,
      }).then((result) => {
        if (version !== requestVersion.current || activeSession !== sessionVersion.current) return;
        setGroups(result.groups);
      }).catch(() => {
        if (version !== requestVersion.current || activeSession !== sessionVersion.current) return;
        setError('Suggestions unavailable');
        setGroups([]);
      }).finally(() => {
        if (version === requestVersion.current && activeSession === sessionVersion.current) setLoading(false);
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      requestVersion.current += 1;
    };
  }, [accountScopeKey, input.enabled, input.port, input.query, sessionActive]);

  const close = useCallback(() => {
    requestVersion.current += 1;
    sessionVersion.current += 1;
    setSessionActive(false);
    setOpen(false);
    setExpandedTitle(null);
    setVariants([]);
    setLoadedTitle(null);
    setGroups([]);
    setLoading(false);
  }, []);

  const activate = useCallback(() => {
    sessionVersion.current += 1;
    setSessionActive(true);
  }, []);

  const deactivate = useCallback(() => {
    close();
  }, [close]);

  async function toggleGroup(group: MovementReuseSuggestionGroup) {
    if (group.variantCount <= 1) {
      inputRef.current.onSelected?.({ title: group.title, variant: group.primaryVariant });
      close();
      return;
    }
    if (expandedTitle === group.normalizedTitle) {
      setExpandedTitle(null);
      setVariants([]);
      return;
    }
    setExpandedTitle(group.normalizedTitle);
    if (loadedTitle === group.normalizedTitle && variants.length > 0) return;
    setLoading(true);
    setError('');
    const version = ++requestVersion.current;
    const activeSession = sessionVersion.current;
    const normalizedTitle = group.normalizedTitle;
    const accountIds = [...inputRef.current.accountIds];
    try {
      const result = await inputRef.current.port.movementReuseListVariants({
        normalizedTitle,
        accountIds,
      });
      if (version !== requestVersion.current || activeSession !== sessionVersion.current) return;
      setVariants(result.variants.filter((variant) => variant.representativeMovementId !== group.primaryVariant.representativeMovementId));
      setLoadedTitle(normalizedTitle);
    } catch {
      if (version !== requestVersion.current || activeSession !== sessionVersion.current) return;
      setError('Unable to load variants');
    } finally {
      if (version === requestVersion.current && activeSession === sessionVersion.current) setLoading(false);
    }
  }

  function selectVariant(selection: { title: string; variant: MovementReuseSuggestionVariant }) {
    inputRef.current.onSelected?.(selection);
    close();
  }

  return {
    state: { query: input.query, open: open && sessionActive, loading, groups, expandedTitle, variants, error },
    actions: { activate, deactivate, close, toggleGroup, selectVariant },
  };
}
