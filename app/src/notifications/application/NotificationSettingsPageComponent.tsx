import { useNavigate } from 'react-router-dom';
import type { NotificationSettingsPort } from './notifications.port';
import type { NotificationSettingsLifecyclePort } from './notificationSettingsLifecycle.port';
import { useNotificationSettingsModel } from './useNotificationSettingsModel';
import { NotificationSettingsPageView } from '../ui/NotificationSettingsPageView';

export function NotificationSettingsPageComponent({ required }: { required: { notifications: NotificationSettingsPort; lifecycle: NotificationSettingsLifecyclePort } }) {
  const navigate = useNavigate();
  const model = useNotificationSettingsModel(required.notifications, required.lifecycle);
  return (
    <NotificationSettingsPageView
      state={model.state}
      events={{
        onBack: () => void navigate(-1),
        onRequestPermission: model.actions.requestPermission,
        onOpenSettings: model.actions.openSettings,
        onRetry: model.actions.retry,
      }}
    />
  );
}
