export type AppLifecycleState = 'active' | 'inactive';

export type AppLifecycleUnsubscribe = () => void;

export interface AppLifecyclePort {
  subscribe(listener: (state: AppLifecycleState) => void): AppLifecycleUnsubscribe;
}
