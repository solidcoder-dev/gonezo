import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkspaceToast } from './useWorkspaceToast';

describe('useWorkspaceToast', () => {
  it('keeps toast actions stable across toast updates', () => {
    const { result } = renderHook(() => useWorkspaceToast());

    const initialShowToast = result.current.actions.showToast;
    const initialShowInfo = result.current.actions.showInfo;
    const initialShowError = result.current.actions.showError;
    const initialShowWarning = result.current.actions.showWarning;
    const initialShowNotice = result.current.actions.showNotice;
    const initialClearToast = result.current.actions.clearToast;
    const initialRunToastAction = result.current.actions.runToastAction;

    act(() => {
      result.current.actions.showToast('Saved');
    });

    expect(result.current.toast.message).toBe('Saved');
    expect(result.current.toast.tone).toBe('success');
    expect(result.current.actions.showToast).toBe(initialShowToast);
    expect(result.current.actions.showInfo).toBe(initialShowInfo);
    expect(result.current.actions.showError).toBe(initialShowError);
    expect(result.current.actions.showWarning).toBe(initialShowWarning);
    expect(result.current.actions.showNotice).toBe(initialShowNotice);
    expect(result.current.actions.clearToast).toBe(initialClearToast);
    expect(result.current.actions.runToastAction).toBe(initialRunToastAction);
  });

  it('shows warning notices with an action and runs the action once per invocation', () => {
    const run = vi.fn();
    const { result } = renderHook(() => useWorkspaceToast());

    act(() => {
      result.current.actions.showWarning('Voice processing failed', {
        label: 'Download ZIP',
        run,
      });
    });

    expect(result.current.toast.message).toBe('Voice processing failed');
    expect(result.current.toast.tone).toBe('warning');
    expect(result.current.toast.actionLabel).toBe('Download ZIP');

    act(() => {
      result.current.actions.runToastAction();
    });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('shows and clears toast feedback', () => {
    const { result } = renderHook(() => useWorkspaceToast());

    act(() => {
      result.current.actions.showError({ message: 'Unable to load data' });
    });

    expect(result.current.toast.message).toBe('Unable to load data');
    expect(result.current.toast.tone).toBe('error');

    act(() => {
      result.current.actions.clearToast();
    });

    expect(result.current.toast.message).toBe('');
    expect(result.current.toast.tone).toBe('success');
    expect(result.current.toast.actionLabel).toBe('');
  });

  it('uses success tone for showToast', () => {
    const { result } = renderHook(() => useWorkspaceToast());

    act(() => {
      result.current.actions.showToast('Saved');
    });

    expect(result.current.toast.message).toBe('Saved');
    expect(result.current.toast.tone).toBe('success');
  });

  it('shows info notices with an action and runs the action once per invocation', () => {
    const run = vi.fn();
    const { result } = renderHook(() => useWorkspaceToast());

    act(() => {
      result.current.actions.showInfo('Voice draft created', {
        label: 'Download ZIP',
        run,
      });
    });

    expect(result.current.toast.message).toBe('Voice draft created');
    expect(result.current.toast.tone).toBe('info');
    expect(result.current.toast.actionLabel).toBe('Download ZIP');

    act(() => {
      result.current.actions.runToastAction();
    });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('assigns different identities to equal messages from different operations', () => {
    const { result } = renderHook(() => useWorkspaceToast());

    let firstId = '';
    let secondId = '';
    act(() => {
      firstId = result.current.actions.showNotice({
        message: 'Saved',
        tone: 'success',
        source: 'transaction.create',
      });
      secondId = result.current.actions.showNotice({
        message: 'Saved',
        tone: 'success',
        source: 'account.rename',
      });
    });

    expect(firstId).not.toBe(secondId);
    expect(result.current.notices).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: firstId, message: 'Saved', source: 'transaction.create' }),
      expect.objectContaining({ id: secondId, message: 'Saved', source: 'account.rename' }),
    ]));
  });

  it('updates only the notice selected by identity', () => {
    const { result } = renderHook(() => useWorkspaceToast());

    let firstId = '';
    let secondId = '';
    act(() => {
      firstId = result.current.actions.showNotice({ message: 'Working', tone: 'info', source: 'first' });
      secondId = result.current.actions.showNotice({ message: 'Working', tone: 'info', source: 'second' });
      result.current.actions.updateNotice(firstId, { message: 'First completed', tone: 'success' });
    });

    expect(result.current.notices).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: firstId, message: 'First completed', source: 'first' }),
      expect.objectContaining({ id: secondId, message: 'Working', source: 'second' }),
    ]));
  });

  it('expires success and warning notices according to their central policies', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useWorkspaceToast());

      act(() => {
        result.current.actions.showToast('Saved');
      });
      act(() => vi.advanceTimersByTime(4999));
      expect(result.current.notices).toHaveLength(1);
      act(() => vi.advanceTimersByTime(1));
      expect(result.current.notices).toHaveLength(0);

      act(() => {
        result.current.actions.showWarning('Check this');
      });
      act(() => vi.advanceTimersByTime(7999));
      expect(result.current.notices).toHaveLength(1);
      act(() => vi.advanceTimersByTime(1));
      expect(result.current.notices).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses one notice for overlapping interaction reasons and resumes remaining time', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useWorkspaceToast());
      let id = '';
      act(() => {
        id = result.current.actions.showToast('Saved');
      });
      act(() => vi.advanceTimersByTime(2000));
      act(() => {
        result.current.actions.pauseNotice(id, 'focus');
        result.current.actions.pauseNotice(id, 'touch');
      });
      act(() => vi.advanceTimersByTime(10000));
      expect(result.current.notices).toHaveLength(1);

      act(() => result.current.actions.resumeNotice(id, 'focus'));
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.notices).toHaveLength(1);
      act(() => result.current.actions.resumeNotice(id, 'touch'));
      act(() => vi.advanceTimersByTime(2999));
      expect(result.current.notices).toHaveLength(1);
      act(() => vi.advanceTimersByTime(1));
      expect(result.current.notices).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels an old timer when a newer notice replaces it', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useWorkspaceToast());
      act(() => result.current.actions.showToast('First'));
      act(() => vi.advanceTimersByTime(3000));
      act(() => result.current.actions.showToast('Second'));
      act(() => vi.advanceTimersByTime(2000));
      expect(result.current.toast.message).toBe('Second');
      act(() => vi.advanceTimersByTime(2999));
      expect(result.current.toast.message).toBe('Second');
      act(() => vi.advanceTimersByTime(1));
      expect(result.current.toast.message).toBe('Second');
      expect(result.current.notices).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cleans up the expiration timer when the hook unmounts', () => {
    vi.useFakeTimers();
    try {
      const { result, unmount } = renderHook(() => useWorkspaceToast());
      act(() => result.current.actions.showToast('Saved'));
      unmount();
      act(() => vi.advanceTimersByTime(5000));
      expect(result.current.notices).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses while the document is hidden and resumes on visibility', () => {
    vi.useFakeTimers();
    const originalHidden = document.hidden;
    try {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      const { result } = renderHook(() => useWorkspaceToast());
      act(() => result.current.actions.showToast('Saved'));
      act(() => vi.advanceTimersByTime(10000));
      expect(result.current.notices).toHaveLength(1);

      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      act(() => document.dispatchEvent(new Event('visibilitychange')));
      act(() => vi.advanceTimersByTime(4999));
      expect(result.current.notices).toHaveLength(1);
      act(() => vi.advanceTimersByTime(1));
      expect(result.current.notices).toHaveLength(0);
    } finally {
      Object.defineProperty(document, 'hidden', { configurable: true, value: originalHidden });
      vi.useRealTimers();
    }
  });

  it('keeps one visible notice and four pending notices in FIFO order', () => {
    const { result } = renderHook(() => useWorkspaceToast());

    act(() => {
      ['one', 'two', 'three', 'four', 'five'].forEach((message) => {
        result.current.actions.showNotice({ message, tone: 'error', source: message });
      });
    });

    expect(result.current.notices.map((notice) => notice.message)).toEqual(['one', 'two', 'three', 'four', 'five']);
  });

  it('groups only explicit duplicate keys without replacing the existing action', () => {
    const run = vi.fn();
    const { result } = renderHook(() => useWorkspaceToast());

    act(() => {
      result.current.actions.showNotice({ message: 'Retry failed', tone: 'error', source: 'sync', deduplicationKey: 'sync', action: { label: 'Retry', run } });
      result.current.actions.showNotice({ message: 'Retry failed again', tone: 'error', source: 'sync', deduplicationKey: 'sync', action: { label: 'Other', run: vi.fn() } });
    });

    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]).toMatchObject({ message: 'Retry failed', count: 2, action: { label: 'Retry' } });
  });

  it('discards pending transient notices before persistent notices when saturated', () => {
    const { result } = renderHook(() => useWorkspaceToast());

    act(() => {
      result.current.actions.showNotice({ message: 'Visible', tone: 'error', source: 'visible' });
      result.current.actions.showNotice({ message: 'Transient one', tone: 'success', source: 'one' });
      result.current.actions.showNotice({ message: 'Persistent one', tone: 'error', source: 'two' });
      result.current.actions.showNotice({ message: 'Persistent two', tone: 'error', source: 'three' });
      result.current.actions.showNotice({ message: 'Persistent three', tone: 'error', source: 'four' });
      result.current.actions.showNotice({ message: 'Newest', tone: 'error', source: 'five' });
    });

    expect(result.current.notices.map((notice) => notice.message)).toEqual([
      'Visible',
      'Persistent one',
      'Persistent two',
      'Persistent three',
      'Newest',
    ]);
  });

  it('uses a saturation notice when all pending notices are persistent', () => {
    const { result } = renderHook(() => useWorkspaceToast());

    act(() => {
      ['Visible', 'one', 'two', 'three', 'four', 'five'].forEach((message) => {
        result.current.actions.showNotice({ message, tone: 'error', source: message });
      });
    });

    expect(result.current.notices).toHaveLength(5);
    expect(result.current.notices.at(-1)).toMatchObject({
      source: 'workspace.saturation',
      message: 'Some feedback was not shown.',
      count: 1,
    });
  });
});
