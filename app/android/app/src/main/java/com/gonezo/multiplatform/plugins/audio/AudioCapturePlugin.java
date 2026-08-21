package com.gonezo.multiplatform.plugins.audio;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.gonezo.multiplatform.plugins.interpretation.artifacts.AndroidPrivateInterpretationArtifactStore;
import com.gonezo.multiplatform.plugins.interpretation.artifacts.AudioArtifactMetadata;
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStorageException;
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStore;
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationRunStage;
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfigurationReader;
import com.gonezo.multiplatform.infrastructure.configuration.TranscriptionMode;
import java.io.File;
import java.util.UUID;
import dev.solidcoder.speech.TranscriptionResult;
import dev.solidcoder.speech.Transcript;
import dev.solidcoder.speech.TranscriptionIssue;

@CapacitorPlugin(
  name = "AudioCapturePlugin",
  permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
  }
)
public class AudioCapturePlugin extends Plugin {
  private static final long MIN_WAV_BYTES = 44L;

  private final AndroidAudioRecorder audioRecorder = new AndroidAudioRecorder();

  private InterpretationArtifactStore artifactStore;
  private StreamingAudioTranscriptionController streamingTranscription;
  private boolean streamingMode;
  private ActiveRecordingSession activeSession;

  @Override
  public void load() {
    artifactStore = new AndroidPrivateInterpretationArtifactStore(getContext().getNoBackupFilesDir());
    streamingMode = new AndroidProcessingConfigurationReader().read().getTranscriptionMode() == TranscriptionMode.STREAMING;
    if (streamingMode) {
      try {
        streamingTranscription = new StreamingAudioTranscriptionController(getContext());
      } catch (RuntimeException ignored) {
        streamingTranscription = null;
      }
    }
    try {
      artifactStore.cleanupTemporaryArtifacts();
    } catch (InterpretationArtifactStorageException ignored) {
    }
  }

  @Override
  protected void handleOnPause() {
    cancelActiveSessionSilently();
  }

  @Override
  protected void handleOnStop() {
    cancelActiveSessionSilently();
  }

  @Override
  protected void handleOnDestroy() {
    cancelActiveSessionSilently();
    if (streamingTranscription != null) {
      streamingTranscription.close();
      streamingTranscription = null;
    }
  }

  @PluginMethod
  public void getMicrophonePermissionStatus(PluginCall call) {
    AudioPermissionGateway permissionGateway = new AudioPermissionGateway(this);
    JSObject result = new JSObject();
    result.put("status", permissionGateway.getStatus());
    call.resolve(result);
  }

  @PluginMethod
  public void requestMicrophonePermission(PluginCall call) {
    AudioPermissionGateway permissionGateway = new AudioPermissionGateway(this);
    permissionGateway.markRequested();
    if (permissionGateway.isGranted()) {
      JSObject result = new JSObject();
      result.put("status", "granted");
      call.resolve(result);
      return;
    }
    requestPermissionForAlias("microphone", call, "requestMicrophonePermissionCallback");
  }

  @PermissionCallback
  private void requestMicrophonePermissionCallback(PluginCall call) {
    AudioPermissionGateway permissionGateway = new AudioPermissionGateway(this);
    JSObject result = new JSObject();
    result.put("status", permissionGateway.getStatus());
    call.resolve(result);
  }

  @PluginMethod
  public void openAppSettings(PluginCall call) {
    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }

  @PluginMethod
  public synchronized void startRecording(PluginCall call) {
    AudioPermissionGateway permissionGateway = new AudioPermissionGateway(this);
    if (!permissionGateway.isGranted()) {
      rejectPermission(call);
      return;
    }
    if (activeSession != null) {
      reject(call, AudioCaptureErrorCode.RECORDING_ALREADY_ACTIVE, "A voice recording is already active.");
      return;
    }

    String runId = null;
    try {
      runId = UUID.randomUUID().toString();
      File recordingFile = artifactStore().beginRun(runId, System.currentTimeMillis());
      String language = call.getString("language");
      boolean detectLanguageAutomatically = call.getBoolean("detectLanguageAutomatically", language == null);
      PcmChunkListener chunkListener = null;
      if (streamingMode) {
        if (streamingTranscription == null) {
          throw new AudioCapturePluginException(AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE, "Streaming speech transcription is unavailable.");
        }
        streamingTranscription.start(language, detectLanguageAutomatically);
        chunkListener = this::acceptStreamingPcm;
      }
      audioRecorder.start(recordingFile, chunkListener);
      long startedAt = System.currentTimeMillis();
      activeSession = new ActiveRecordingSession(runId, startedAt, recordingFile);

      JSObject result = new JSObject();
      result.put("runId", activeSession.runId);
      result.put("startedAt", startedAt);
      call.resolve(result);
    } catch (InterpretationArtifactStorageException exception) {
      if (runId != null) {
        try {
          artifactStore().deleteRun(runId);
        } catch (InterpretationArtifactStorageException ignored) {
        }
      }
      reject(call, AudioCaptureErrorCode.ARTIFACT_STORAGE_FAILED, "Interpretation artifact storage failed.");
    } catch (AudioCapturePluginException exception) {
      if (runId != null) {
        try {
          artifactStore().deleteRun(runId);
        } catch (InterpretationArtifactStorageException ignored) {
        }
      }
      cancelActiveSessionSilently();
      reject(call, exception);
    }
  }

  @PluginMethod
  public synchronized void stopRecording(PluginCall call) {
    ActiveRecordingSession currentSession = activeSession;
    if (currentSession == null) {
      reject(call, AudioCaptureErrorCode.NO_ACTIVE_RECORDING, "No voice recording is active.");
      return;
    }

    try {
      audioRecorder.stopAndFinalize();
      TranscriptionResult streamingResult = streamingTranscription == null ? null : streamingTranscription.finish();
      activeSession = null;

      long durationMs = Math.max(0L, System.currentTimeMillis() - currentSession.startedAt);
      long sizeBytes = currentSession.recordingFile.length();

      if (durationMs < AudioCaptureConfiguration.MIN_RECORDING_DURATION_MS) {
        markCaptureFailed(currentSession.runId, AudioCaptureErrorCode.RECORDING_TOO_SHORT);
        reject(call, AudioCaptureErrorCode.RECORDING_TOO_SHORT, "The voice recording was too short.");
        return;
      }

      if (sizeBytes <= MIN_WAV_BYTES) {
        markCaptureFailed(currentSession.runId, AudioCaptureErrorCode.EMPTY_AUDIO);
        reject(call, AudioCaptureErrorCode.EMPTY_AUDIO, "The voice recording did not contain audio.");
        return;
      }

      try {
        artifactStore().completeAudio(
          currentSession.runId,
          new AudioArtifactMetadata("audio/wav", durationMs, sizeBytes)
        );
      } catch (InterpretationArtifactStorageException exception) {
        markCaptureFailed(currentSession.runId, AudioCaptureErrorCode.ARTIFACT_STORAGE_FAILED);
        reject(call, AudioCaptureErrorCode.ARTIFACT_STORAGE_FAILED, "Interpretation artifact storage failed.");
        return;
      }

      JSObject result = new JSObject();
      result.put("runId", currentSession.runId);
      result.put("audioRef", currentSession.audioRef);
      result.put("mimeType", "audio/wav");
      result.put("durationMs", durationMs);
      result.put("sizeBytes", sizeBytes);
      if (streamingResult != null) {
        putTranscriptionResult(result, streamingResult);
      }
      call.resolve(result);
    } catch (AudioCapturePluginException exception) {
      markCaptureFailed(currentSession.runId, exception.code());
      activeSession = null;
      reject(call, exception);
    }
  }

  @PluginMethod
  public synchronized void cancelRecording(PluginCall call) {
    try {
      cancelActiveSessionSilently();
      call.resolve();
    } catch (InterpretationArtifactStorageException exception) {
      reject(call, AudioCaptureErrorCode.ARTIFACT_STORAGE_FAILED, "Interpretation artifact storage failed.");
    }
  }

  @PluginMethod
  public synchronized void discardRun(PluginCall call) {
    String runId = call.getString("runId");
    if (runId == null || runId.isBlank()) {
      reject(call, AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE, "Interpretation run reference is required.");
      return;
    }

    try {
      artifactStore().deleteRun(runId);
      call.resolve();
    } catch (InterpretationArtifactStorageException exception) {
      reject(call, AudioCaptureErrorCode.ARTIFACT_STORAGE_FAILED, "Interpretation artifact storage failed.");
    }
  }

  private void rejectPermission(PluginCall call) {
    AudioPermissionGateway permissionGateway = new AudioPermissionGateway(this);
    if (permissionGateway.isPermanentlyDenied()) {
      reject(
        call,
        AudioCaptureErrorCode.PERMISSION_PERMANENTLY_DENIED,
        "Microphone access is blocked. Enable it in Android settings to record a voice draft."
      );
      return;
    }
    reject(call, AudioCaptureErrorCode.PERMISSION_DENIED, "Microphone access was denied.");
  }

  private void reject(PluginCall call, AudioCapturePluginException exception) {
    call.reject(exception.getMessage(), exception.code().wireValue(), exception);
  }

  private void reject(PluginCall call, AudioCaptureErrorCode code, String message) {
    call.reject(message, code.wireValue());
  }

  private void cancelActiveSessionSilently() {
    if (activeSession != null) {
      try {
        artifactStore().deleteRun(activeSession.runId);
      } catch (InterpretationArtifactStorageException ignored) {
      }
    }
    audioRecorder.cancelAndDelete();
    if (streamingTranscription != null) {
      streamingTranscription.cancel();
    }
    activeSession = null;
  }

  private void acceptStreamingPcm(byte[] buffer, int length) {
    if (streamingTranscription != null) {
      streamingTranscription.acceptPcm16(buffer, length);
    }
  }

  private void putTranscriptionResult(JSObject result, TranscriptionResult transcription) {
    Transcript transcript = transcription.getTranscript();
    if (transcript != null) {
      result.put("transcript", new JSObject().put("text", transcript.getText()));
    }
    if (!transcription.getIssues().isEmpty()) {
      TranscriptionIssue issue = transcription.getIssues().get(0);
      result.put(
        "transcriptionError",
        new JSObject()
          .put("code", issue.getCode())
          .put("message", issue.getMessage())
          .put("recoverable", issue.getRecoverable())
          .put("retryable", issue.getRetryable())
      );
    }
  }

  private InterpretationArtifactStore artifactStore() {
    if (artifactStore == null) {
      artifactStore = new AndroidPrivateInterpretationArtifactStore(getContext().getNoBackupFilesDir());
    }
    return artifactStore;
  }

  private void markCaptureFailed(String runId, AudioCaptureErrorCode code) {
    try {
      artifactStore().markFailed(runId, InterpretationRunStage.CAPTURE, code.wireValue());
    } catch (InterpretationArtifactStorageException ignored) {
    }
  }

  private static final class ActiveRecordingSession {
    private final String runId;
    private final long startedAt;
    private final File recordingFile;
    private final String audioRef;

    private ActiveRecordingSession(String runId, long startedAt, File recordingFile) {
      this.runId = runId;
      this.startedAt = startedAt;
      this.recordingFile = recordingFile;
      this.audioRef = runId;
    }
  }
}
