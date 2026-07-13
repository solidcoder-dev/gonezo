import type { AppLifecyclePort, AppLifecycleState, AppLifecycleUnsubscribe } from '../../../transactions/application/MovementVoiceEntry/AppLifecyclePort';

function resolveLifecycleState(): AppLifecycleState {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return 'inactive';
  }
  return 'active';
}

export class BrowserAppLifecycleAdapter implements AppLifecyclePort {
  subscribe(listener: (state: AppLifecycleState) => void): AppLifecycleUnsubscribe {
    const notify = () => listener(resolveLifecycleState());
    const handleVisibilityChange = () => notify();
    const handlePageHide = () => listener('inactive');
    const handleFocus = () => listener('active');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('focus', handleFocus);
    };
  }
}
