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
});
