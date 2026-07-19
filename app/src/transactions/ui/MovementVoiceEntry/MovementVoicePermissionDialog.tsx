import { useEffect, useId, useRef, type RefObject } from 'react';
import './MovementVoicePermissionDialog.css';

type MovementVoicePermissionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  safeActionLabel: string;
  dismissActionLabel: string;
  busy?: boolean;
  restoreFocusTo?: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  onSafeAction: () => void;
};

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function MovementVoicePermissionDialog({
  open,
  title,
  description,
  safeActionLabel,
  dismissActionLabel,
  busy = false,
  restoreFocusTo,
  onDismiss,
  onSafeAction,
}: MovementVoicePermissionDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dismissButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let closedFromBack = false;
    const restoreFocusTarget = restoreFocusTo?.current ?? null;
    dismissButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusables = focusableElements(dialogRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const historyEntry = { movementVoicePermissionDialog: true };
    window.history.pushState(historyEntry, '');
    const handlePopState = () => {
      closedFromBack = true;
      onDismiss();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      if (!closedFromBack && window.history.state?.movementVoicePermissionDialog) {
        window.history.replaceState(null, '', window.location.href);
      }
      restoreFocusTarget?.focus();
    };
  }, [onDismiss, open, restoreFocusTo]);

  if (!open) {
    return null;
  }

  return (
    <div className="movement-voice-permission-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="movement-voice-permission-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="movement-voice-permission-copy">
          <h3 id={titleId}>{title}</h3>
          <p id={descriptionId}>{description}</p>
        </div>
        <div className="movement-voice-permission-actions">
          <button
            ref={dismissButtonRef}
            type="button"
            className="text-button"
            onClick={onDismiss}
            disabled={busy}
          >
            {dismissActionLabel}
          </button>
          <button
            type="button"
            className="primary-cta"
            onClick={onSafeAction}
            disabled={busy}
          >
            {safeActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
