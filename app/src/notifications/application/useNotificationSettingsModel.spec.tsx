import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationSettingsPort } from './notifications.port';
import type { NotificationSettingsLifecyclePort } from './notificationSettingsLifecycle.port';
import { useNotificationSettingsModel } from './useNotificationSettingsModel';

let resume: (() => void) | undefined;
const remove = vi.fn();

function createPort(permission: NotificationSettingsPort['getPermissionState'] extends () => Promise<infer T> ? T : never = 'denied') {
  return {
    getPermissionState: vi.fn().mockResolvedValue(permission),
    requestPermission: vi.fn().mockResolvedValue(undefined),
    openSettings: vi.fn().mockResolvedValue(undefined),
  } satisfies NotificationSettingsPort;
}

function createLifecycle(): NotificationSettingsLifecyclePort {
  return {
    addResumeListener: vi.fn((listener: () => void) => {
      resume = listener;
      return Promise.resolve(remove);
    }),
  };
}

beforeEach(() => {
  resume = undefined;
  remove.mockClear();
});

describe('useNotificationSettingsModel', () => {
  it('loads the current permission state', async () => {
    const port = createPort('granted');
    const { result } = renderHook(() => useNotificationSettingsModel(port, createLifecycle()));

    await waitFor(() => expect(result.current.state).toMatchObject({ permission: 'granted', loading: false, error: null }));
    expect(port.getPermissionState).toHaveBeenCalledOnce();
  });

  it('requests permission and refreshes after the command', async () => {
    const port = createPort('denied');
    port.getPermissionState.mockResolvedValueOnce('denied').mockResolvedValueOnce('granted');
    const { result } = renderHook(() => useNotificationSettingsModel(port, createLifecycle()));

    await waitFor(() => expect(result.current.state.loading).toBe(false));
    act(() => result.current.actions.requestPermission());
    await waitFor(() => expect(result.current.state.permission).toBe('granted'));
    expect(port.requestPermission).toHaveBeenCalledOnce();
  });

  it('refreshes when the app resumes from a permission surface', async () => {
    const port = createPort('denied');
    port.getPermissionState.mockResolvedValueOnce('denied').mockResolvedValueOnce('granted');
    const { result } = renderHook(() => useNotificationSettingsModel(port, createLifecycle()));

    await waitFor(() => expect(result.current.state.loading).toBe(false));
    act(() => resume?.());
    await waitFor(() => expect(result.current.state.permission).toBe('granted'));
    expect(port.getPermissionState).toHaveBeenCalledTimes(2);
  });

  it('surfaces read and command errors', async () => {
    const port = createPort();
    port.getPermissionState.mockRejectedValueOnce(new Error('read failed'));
    const { result } = renderHook(() => useNotificationSettingsModel(port, createLifecycle()));

    await waitFor(() => expect(result.current.state.error).toBe('Unable to load notification settings'));
    port.getPermissionState.mockResolvedValue('denied');
    port.requestPermission.mockRejectedValueOnce(new Error('request failed'));
    act(() => result.current.actions.requestPermission());
    await waitFor(() => expect(result.current.state.error).toBe('Unable to update notification settings'));
  });
});
