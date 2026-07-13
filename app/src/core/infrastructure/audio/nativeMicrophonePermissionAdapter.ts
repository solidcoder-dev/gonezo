import type {
  MicrophonePermissionPort,
  MicrophonePermissionStatus,
} from '../../../transactions/application/MovementVoiceEntry/MicrophonePermissionPort';
import { AudioCapturePlugin } from './audioCapturePlugin';

type NativePluginError = {
  code?: string;
  message?: string;
};

function toAudioCaptureError(error: unknown): NativePluginError {
  if (typeof error === 'object' && error !== null) {
    return {
      code: typeof (error as NativePluginError).code === 'string' ? (error as NativePluginError).code : undefined,
      message: typeof (error as NativePluginError).message === 'string' ? (error as NativePluginError).message : undefined,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Unknown microphone permission failure.' };
}

export class NativeMicrophonePermissionAdapter implements MicrophonePermissionPort {
  async getStatus(): Promise<MicrophonePermissionStatus> {
    try {
      const result = await AudioCapturePlugin.getMicrophonePermissionStatus();
      return result.status;
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }

  async request(): Promise<MicrophonePermissionStatus> {
    try {
      const result = await AudioCapturePlugin.requestMicrophonePermission();
      return result.status;
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }

  async openSettings(): Promise<void> {
    try {
      await AudioCapturePlugin.openAppSettings();
    } catch (error) {
      throw toAudioCaptureError(error);
    }
  }
}
