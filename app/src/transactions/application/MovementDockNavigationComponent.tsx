import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigationView } from '../../shared/ui/BottomNavigation/BottomNavigationView';
import type { BottomNavigationItemView } from '../../shared/ui/BottomNavigation/BottomNavigationView.contract';
import { MovementAccountSelectorView } from '../ui/MovementAccountSelector/MovementAccountSelectorView';
import { MovementDraftPickerView } from '../ui/MovementDraftPicker/MovementDraftPickerView';
import { MovementTypeSelectorView } from '../ui/MovementTypeSelector/MovementTypeSelectorView';
import type { MovementQuickActionComponentProps } from './MovementQuickActionComponent.contract';
import { useMovementQuickActionModel } from './useMovementQuickActionModel';

const DOCK_ITEMS: BottomNavigationItemView[] = [
  { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door-fill' },
  { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
  { id: 'add', label: 'Add movement', iconClassName: 'bi bi-plus-lg' },
  { id: 'movements', label: 'Movements', iconClassName: 'bi bi-list-ul' },
  { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
];

const PAGE_PATH_BY_ID: Record<string, string> = {
  home: '/home',
  analytics: '/analytics',
  movements: '/movements',
  profile: '/profile',
};

function activeItemIdFromPath(pathname: string): string {
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/movements') && !pathname.startsWith('/movements/search')) return 'movements';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'home';
}

export function MovementDockNavigationComponent({ required, provided = {} }: MovementQuickActionComponentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const ports = useMemo(() => ({
    ledger: required.context.core,
    preferences: required.context.core,
  }), [required.context.core]);
  const model = useMovementQuickActionModel({
    ports,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    draftRequest: required.config.draftRequest,
    events: provided.events,
  });

  function selectItem(itemId: string) {
    if (itemId === 'add') {
      model.provided.commands.openDraft();
      return;
    }

    const path = PAGE_PATH_BY_ID[itemId];
    if (path) {
      navigate(path);
    }
  }

  return (
    <>
      <BottomNavigationView
        required={{
          config: {
            ariaLabel: 'Primary navigation',
          },
          data: {
            items: DOCK_ITEMS,
          },
          state: {
            activeItemId: model.required.state.draftOpen ? 'add' : activeItemIdFromPath(location.pathname),
          },
          status: {
            disabled: false,
          },
        }}
        provided={{
          commands: {
            select: selectItem,
          },
        }}
      />
      <MovementDraftPickerView
        required={{
          state: {
            open: model.required.state.draftOpen,
            accountName: model.required.state.selectedAccountName,
            movementType: model.required.state.selectedMovementType,
            accountSelectorOpen: model.required.state.accountSelectorOpen,
            typeSelectorOpen: model.required.state.typeSelectorOpen,
          },
          status: {
            disabled: model.required.status.disabled,
          },
        }}
        provided={{
          commands: {
            close: model.provided.commands.closeDraft,
            expand: model.provided.commands.expandDraft,
            toggleAccountSelector: model.provided.commands.toggleAccountSelector,
            toggleTypeSelector: model.provided.commands.toggleTypeSelector,
          },
        }}
      />
      <MovementAccountSelectorView
        required={{
          data: {
            accounts: model.required.state.accounts,
          },
          state: {
            open: model.required.state.accountSelectorOpen,
            selectedAccountId: model.required.state.selectedAccountId,
          },
          status: {
            disabled: model.required.status.disabled,
          },
        }}
        provided={{
          commands: {
            close: model.provided.commands.closeAccountSelector,
            selectAccount: model.provided.commands.selectAccount,
          },
        }}
      />
      <MovementTypeSelectorView
        required={{
          state: {
            open: model.required.state.typeSelectorOpen,
            selectedType: model.required.state.selectedMovementType,
          },
          status: {
            disabled: model.required.status.disabled,
          },
        }}
        provided={{
          commands: {
            close: model.provided.commands.closeTypeSelector,
            selectType: model.provided.commands.selectMovementType,
          },
        }}
      />
    </>
  );
}
