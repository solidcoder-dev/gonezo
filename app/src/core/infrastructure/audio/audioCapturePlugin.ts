import { registerPlugin } from '@capacitor/core';

export type AudioCapturePluginSession = {
  runId: string;
  startedAt: number;
};

export type AudioCapturePluginResult = {
  runId: string;
  audioRef: string;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
};

export type AudioCapturePluginPermissionResult = {
  status: 'granted' | 'prompt' | 'denied' | 'permanently-denied';
};

export type AudioCapturePluginDiscardRunInput = {
  runId: string;
};

export interface AudioCapturePlugin {
  getMicrophonePermissionStatus(): Promise<AudioCapturePluginPermissionResult>;
  requestMicrophonePermission(): Promise<AudioCapturePluginPermissionResult>;
  openAppSettings(): Promise<void>;
  startRecording(): Promise<AudioCapturePluginSession>;
  stopRecording(): Promise<AudioCapturePluginResult>;
  cancelRecording(): Promise<void>;
  discardRun(input: AudioCapturePluginDiscardRunInput): Promise<void>;
}

export const AudioCapturePlugin = registerPlugin<AudioCapturePlugin>('AudioCapturePlugin', {
  web: () => import('./audioCapturePluginWeb').then((module) => new module.AudioCapturePluginWeb()),
});
