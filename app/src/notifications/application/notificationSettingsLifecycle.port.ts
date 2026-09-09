export type NotificationSettingsLifecyclePort = {
  addResumeListener: (listener: () => void) => Promise<() => void>;
};
