import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { NotificationItem, NotificationsPort } from './notifications.port';
import type { WorkspacePagePort } from '../../workspace/application/WorkspacePage';
import type { TaxonomyPagePort } from '../../taxonomy/application/TaxonomyPage';
import { MovementDetailOverlayComponent } from '../../movements/application/MovementDetailOverlayComponent';
import type { MovementDetailSelection } from '../../movements/application/movementDetailView.types';
import { useNotificationsPageModel } from './useNotificationsPageModel';
import { NotificationsPageView } from '../ui/NotificationsPageView';

type NotificationsMovementCore = WorkspacePagePort & TaxonomyPagePort;

export function NotificationsPageComponent({ required }: { required: { notifications: NotificationsPort; core: NotificationsMovementCore } }) {
  const navigate = useNavigate();
  const model = useNotificationsPageModel(required.notifications);
  const [selection, setSelection] = useState<MovementDetailSelection | null>(null);
  function openItem(item: NotificationItem) {
    model.actions.markRead(item.id);
    const source = item.sourceType === 'expected' ? 'expected' : item.sourceType === 'scheduled' ? 'scheduled' : null;
    if (source) setSelection({ source, id: item.sourceId });
  }
  return <>
    <NotificationsPageView state={model.state} events={{
    onBack: () => void navigate(-1),
    onFilterChanged: model.actions.setFilter,
    onLoadMore: model.actions.loadMore,
    onMarkRead: model.actions.markRead,
    onOpen: openItem,
    onMarkAllRead: model.actions.markAllRead,
    onRequestPermission: model.actions.requestPermission,
    onOpenSettings: model.actions.openSettings,
    onRetry: model.actions.retry,
    }} />
    {selection ? <MovementDetailOverlayComponent required={{ context: { core: required.core }, data: { selection } }} provided={{ commands: { refreshMovements: async () => undefined }, events: { onClose: () => setSelection(null) } }} /> : null}
  </>;
}
