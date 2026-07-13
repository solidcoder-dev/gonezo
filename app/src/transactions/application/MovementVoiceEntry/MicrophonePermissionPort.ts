export type MicrophonePermissionStatus =
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'permanently-denied';

export interface MicrophonePermissionPort {
  getStatus(): Promise<MicrophonePermissionStatus>;
  request(): Promise<MicrophonePermissionStatus>;
  openSettings(): Promise<void>;
}
