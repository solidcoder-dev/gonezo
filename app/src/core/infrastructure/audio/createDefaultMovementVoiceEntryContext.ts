import { CaptureVoiceInput } from '../../../transactions/application/MovementVoiceEntry/CaptureVoiceInput';
import { NativeMovementEntryDraftInterpreterAdapter } from './nativeMovementEntryDraftInterpreterAdapter';
import { isNativeRuntime } from '../runtimeAdapterSupport';
import { TranscribeVoiceInput } from '../../../transactions/application/MovementVoiceEntry/TranscribeVoiceInput';
import type { TranscriptionSettings } from '../../../transactions/application/MovementVoiceEntry/TranscriptionSettings';
import type { MovementVoiceEntryContext } from '../../../transactions/application/MovementVoiceEntry/movementVoiceEntryContext';
import { BrowserAppLifecycleAdapter } from './browserAppLifecycleAdapter';
import { NativeAudioCaptureAdapter } from './nativeAudioCaptureAdapter';
import { NativeMicrophonePermissionAdapter } from './nativeMicrophonePermissionAdapter';
import { NativeSpeechTranscriptionAdapter } from './nativeSpeechTranscriptionAdapter';
import { NativeInterpretationRunExporter } from '../interpretation/nativeInterpretationRunExporter';

export function createDefaultMovementVoiceEntryContext(): MovementVoiceEntryContext {
  const audioCapture = new NativeAudioCaptureAdapter();
  const transcriptionSettings: TranscriptionSettings = {
    language: 'es',
    detectLanguageAutomatically: false,
  };
  return {
    enabled: isNativeRuntime(),
    captureVoiceInput: new CaptureVoiceInput(audioCapture),
    transcribeVoiceInput: new TranscribeVoiceInput(new NativeSpeechTranscriptionAdapter(), transcriptionSettings),
    interpretMovementEntryDraft: new NativeMovementEntryDraftInterpreterAdapter(),
    interpretationRunExporter: isNativeRuntime() ? new NativeInterpretationRunExporter() : undefined,
    microphonePermission: new NativeMicrophonePermissionAdapter(),
    appLifecycle: new BrowserAppLifecycleAdapter(),
  };
}
