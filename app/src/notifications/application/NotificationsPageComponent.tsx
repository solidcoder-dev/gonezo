import { useNavigate } from 'react-router-dom';
import type { NotificationsPort } from './notifications.port';
import { useNotificationsPageModel } from './useNotificationsPageModel';
import { NotificationsPageView } from '../ui/NotificationsPageView';

export function NotificationsPageComponent({ required }: { required: { notifications: NotificationsPort } }) {
  const navigate = useNavigate();
  const model = useNotificationsPageModel(required.notifications);
  return <NotificationsPageView state={model.state} events={{
    onBack: () => void navigate(-1),
    onFilterChanged: model.actions.setFilter,
    onLoadMore: model.actions.loadMore,
    onMarkRead: model.actions.markRead,
    onOpen: (item) => model.actions.markRead(item.id),
    onMarkAllRead: model.actions.markAllRead,
    onRequestPermission: model.actions.requestPermission,
    onOpenSettings: model.actions.openSettings,
    onRetry: model.actions.retry,
  }} />;
}
