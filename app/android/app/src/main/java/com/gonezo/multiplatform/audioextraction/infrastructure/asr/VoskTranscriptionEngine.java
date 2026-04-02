package com.gonezo.multiplatform.audioextraction.infrastructure.asr;

import android.content.Context;
import android.media.AudioFormat;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.util.Log;
import com.gonezo.audioextraction.application.pipeline.TranscriptionEngine;
import com.gonezo.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.audioextraction.domain.error.ErrorCode;
import com.gonezo.audioextraction.domain.model.Segment;
import com.gonezo.audioextraction.domain.model.SourceAudio;
import com.gonezo.audioextraction.domain.model.Transcript;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;

public final class VoskTranscriptionEngine implements TranscriptionEngine {
  private static final String LOG_TAG = "GonezoAudioExtract";
  private static final long CODEC_TIMEOUT_US = 10_000L;
  private static final int TARGET_SAMPLE_RATE = 16_000;
  private static final int RECOGNIZER_CHUNK_SIZE = 4_000;
  private static final String DEFAULT_MODEL_ASSET_DIR = "vosk-model-small-en-us-0.15";

  private final Context appContext;
  private final VoskModelProvider modelProvider;

  public VoskTranscriptionEngine(Context context) {
    this(context, DEFAULT_MODEL_ASSET_DIR);
  }

  public VoskTranscriptionEngine(Context context, String modelAssetDir) {
    this.appContext = context.getApplicationContext();
    this.modelProvider = new VoskModelProvider(modelAssetDir == null || modelAssetDir.isBlank() ? DEFAULT_MODEL_ASSET_DIR : modelAssetDir);
  }

  @Override
  public Transcript transcribe(SourceAudio audio) {
    if (audio == null || audio.getBytes() == null || audio.getBytes().length == 0) {
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Audio source is empty", null);
    }

    PcmAudio pcmAudio;
    try {
      pcmAudio = decodeToMonoPcm16(audio);
    } catch (RuntimeException ex) {
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Cannot decode source audio", ex);
    }

    if (pcmAudio.bytes.length == 0) {
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Decoded audio is empty", null);
    }

    String transcript = recognizeText(pcmAudio);
    if (transcript.isBlank()) {
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Vosk transcription produced empty transcript", null);
    }

    return new Transcript(transcript, List.of(new Segment(transcript, 0L, 0L)));
  }

  private String recognizeText(PcmAudio pcmAudio) {
    Model model = modelProvider.getModel(appContext);
    try (Recognizer recognizer = new Recognizer(model, pcmAudio.sampleRate)) {
      StringBuilder text = new StringBuilder();
      int offset = 0;
      while (offset < pcmAudio.bytes.length) {
        int length = Math.min(RECOGNIZER_CHUNK_SIZE, pcmAudio.bytes.length - offset);
        byte[] chunk = Arrays.copyOfRange(pcmAudio.bytes, offset, offset + length);
        if (recognizer.acceptWaveForm(chunk, length)) {
          appendRecognizedText(text, recognizer.getResult());
        }
        offset += length;
      }

      appendRecognizedText(text, recognizer.getFinalResult());
      if (text.length() == 0) {
        appendRecognizedText(text, recognizer.getPartialResult());
      }
      return text.toString().trim();
    } catch (RuntimeException ex) {
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Vosk recognition failed", ex);
    }
  }

  private void appendRecognizedText(StringBuilder target, String jsonResult) {
    String text = extractTextField(jsonResult);
    if (text.isBlank()) {
      return;
    }
    if (target.length() > 0) {
      target.append(' ');
    }
    target.append(text.trim());
  }

  private String extractTextField(String jsonResult) {
    if (jsonResult == null || jsonResult.isBlank()) {
      return "";
    }
    try {
      JSONObject json = new JSONObject(jsonResult);
      String text = json.optString("text", "");
      if (!text.isBlank()) {
        return text.trim();
      }
      String partial = json.optString("partial", "");
      return partial == null ? "" : partial.trim();
    } catch (JSONException ignored) {
      return "";
    }
  }

  private PcmAudio decodeToMonoPcm16(SourceAudio sourceAudio) {
    MediaExtractor extractor = new MediaExtractor();
    MediaCodec decoder = null;
    File tempFile = null;
    try {
      String sourcePath = resolveSourcePath(sourceAudio);
      if (sourcePath == null) {
        tempFile = createTempAudioFile(sourceAudio.getBytes());
        sourcePath = tempFile.getAbsolutePath();
      }
      extractor.setDataSource(sourcePath);
      int trackIndex = findAudioTrack(extractor);
      if (trackIndex < 0) {
        throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "No audio track available", null);
      }

      extractor.selectTrack(trackIndex);
      MediaFormat inputFormat = extractor.getTrackFormat(trackIndex);
      String mimeType = inputFormat.getString(MediaFormat.KEY_MIME);
      if (mimeType == null || mimeType.isBlank()) {
        throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Audio mime type unavailable", null);
      }

      decoder = MediaCodec.createDecoderByType(mimeType);
      decoder.configure(inputFormat, null, null, 0);
      decoder.start();

      ByteArrayOutputStream pcmOutput = new ByteArrayOutputStream();
      int sampleRate = inputFormat.containsKey(MediaFormat.KEY_SAMPLE_RATE)
        ? inputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        : TARGET_SAMPLE_RATE;
      int channelCount = inputFormat.containsKey(MediaFormat.KEY_CHANNEL_COUNT)
        ? inputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        : 1;
      int pcmEncoding = AudioFormat.ENCODING_PCM_16BIT;

      MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
      boolean inputDone = false;
      boolean outputDone = false;

      while (!outputDone) {
        if (!inputDone) {
          int inputBufferIndex = decoder.dequeueInputBuffer(CODEC_TIMEOUT_US);
          if (inputBufferIndex >= 0) {
            ByteBuffer inputBuffer = decoder.getInputBuffer(inputBufferIndex);
            if (inputBuffer != null) {
              inputBuffer.clear();
              int sampleSize = extractor.readSampleData(inputBuffer, 0);
              if (sampleSize < 0) {
                decoder.queueInputBuffer(inputBufferIndex, 0, 0, 0L, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                inputDone = true;
              } else {
                decoder.queueInputBuffer(inputBufferIndex, 0, sampleSize, extractor.getSampleTime(), 0);
                extractor.advance();
              }
            }
          }
        }

        int outputBufferIndex = decoder.dequeueOutputBuffer(bufferInfo, CODEC_TIMEOUT_US);
        if (outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
          MediaFormat outputFormat = decoder.getOutputFormat();
          if (outputFormat.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
            sampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
          }
          if (outputFormat.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
            channelCount = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
          }
          if (outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
            pcmEncoding = outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING);
          }
        } else if (outputBufferIndex >= 0) {
          ByteBuffer outputBuffer = decoder.getOutputBuffer(outputBufferIndex);
          if (outputBuffer != null && bufferInfo.size > 0) {
            byte[] chunk = new byte[bufferInfo.size];
            outputBuffer.position(bufferInfo.offset);
            outputBuffer.limit(bufferInfo.offset + bufferInfo.size);
            outputBuffer.get(chunk);
            pcmOutput.write(chunk, 0, chunk.length);
          }
          decoder.releaseOutputBuffer(outputBufferIndex, false);
          if ((bufferInfo.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
            outputDone = true;
          }
        }
      }

      byte[] monoPcm = pcmOutput.toByteArray();
      if (pcmEncoding == AudioFormat.ENCODING_PCM_FLOAT) {
        monoPcm = convertFloatPcmTo16Bit(monoPcm);
      }
      if (channelCount > 1) {
        monoPcm = downmixToMonoPcm16(monoPcm, channelCount);
      }
      if (sampleRate > 0 && sampleRate != TARGET_SAMPLE_RATE) {
        monoPcm = resamplePcm16Mono(monoPcm, sampleRate, TARGET_SAMPLE_RATE);
        sampleRate = TARGET_SAMPLE_RATE;
      }
      return new PcmAudio(monoPcm, sampleRate <= 0 ? TARGET_SAMPLE_RATE : sampleRate);
    } catch (IOException ex) {
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Cannot decode audio stream", ex);
    } finally {
      try {
        extractor.release();
      } catch (RuntimeException ignored) {
        // no-op
      }
      if (decoder != null) {
        try {
          decoder.stop();
        } catch (RuntimeException ignored) {
          // no-op
        }
        try {
          decoder.release();
        } catch (RuntimeException ignored) {
          // no-op
        }
      }
      if (tempFile != null && tempFile.exists() && !tempFile.delete()) {
        Log.w(LOG_TAG, "Cannot delete temporary decoded source file " + tempFile.getAbsolutePath());
      }
    }
  }

  private String resolveSourcePath(SourceAudio sourceAudio) {
    String sourceRef = sourceAudio.getSourceRef();
    if (sourceRef == null || sourceRef.isBlank()) {
      return null;
    }
    File directFile = new File(sourceRef);
    if (directFile.exists()) {
      return directFile.getAbsolutePath();
    }
    return null;
  }

  private File createTempAudioFile(byte[] bytes) throws IOException {
    File temp = File.createTempFile("voice-extract-", ".m4a", appContext.getCacheDir());
    try (FileOutputStream output = new FileOutputStream(temp)) {
      output.write(bytes);
      output.flush();
    }
    return temp;
  }

  private int findAudioTrack(MediaExtractor extractor) {
    for (int index = 0; index < extractor.getTrackCount(); index++) {
      MediaFormat format = extractor.getTrackFormat(index);
      String mime = format.getString(MediaFormat.KEY_MIME);
      if (mime != null && mime.startsWith("audio/")) {
        return index;
      }
    }
    return -1;
  }

  private byte[] downmixToMonoPcm16(byte[] stereoPcm, int channelCount) {
    if (channelCount <= 1) {
      return stereoPcm;
    }
    int bytesPerSample = 2;
    int frameSize = channelCount * bytesPerSample;
    int frameCount = stereoPcm.length / frameSize;
    ByteBuffer input = ByteBuffer.wrap(stereoPcm).order(ByteOrder.LITTLE_ENDIAN);
    ByteBuffer output = ByteBuffer.allocate(frameCount * bytesPerSample).order(ByteOrder.LITTLE_ENDIAN);
    for (int frame = 0; frame < frameCount; frame++) {
      int sum = 0;
      for (int channel = 0; channel < channelCount; channel++) {
        sum += input.getShort();
      }
      short mono = (short) (sum / channelCount);
      output.putShort(mono);
    }
    return output.array();
  }

  private byte[] convertFloatPcmTo16Bit(byte[] floatPcmBytes) {
    if (floatPcmBytes.length == 0) {
      return floatPcmBytes;
    }
    ByteBuffer input = ByteBuffer.wrap(floatPcmBytes).order(ByteOrder.LITTLE_ENDIAN);
    ByteBuffer output = ByteBuffer.allocate((floatPcmBytes.length / 4) * 2).order(ByteOrder.LITTLE_ENDIAN);
    while (input.remaining() >= 4) {
      float sample = input.getFloat();
      sample = Math.max(-1.0f, Math.min(1.0f, sample));
      short pcm16 = (short) (sample * 32767f);
      output.putShort(pcm16);
    }
    return output.array();
  }

  private byte[] resamplePcm16Mono(byte[] inputPcm, int inputRate, int outputRate) {
    if (inputRate <= 0 || outputRate <= 0 || inputRate == outputRate || inputPcm.length < 4) {
      return inputPcm;
    }
    ByteBuffer inputBuffer = ByteBuffer.wrap(inputPcm).order(ByteOrder.LITTLE_ENDIAN);
    short[] inputSamples = new short[inputPcm.length / 2];
    for (int i = 0; i < inputSamples.length; i++) {
      inputSamples[i] = inputBuffer.getShort();
    }

    int outputSamples = (int) (((long) inputSamples.length * outputRate) / inputRate);
    if (outputSamples <= 0) {
      return new byte[0];
    }
    ByteBuffer outputBuffer = ByteBuffer.allocate(outputSamples * 2).order(ByteOrder.LITTLE_ENDIAN);
    for (int i = 0; i < outputSamples; i++) {
      float sourceIndex = (float) i * inputRate / outputRate;
      int index = (int) sourceIndex;
      int nextIndex = Math.min(index + 1, inputSamples.length - 1);
      float fraction = sourceIndex - index;
      float sample = inputSamples[index] * (1f - fraction) + inputSamples[nextIndex] * fraction;
      outputBuffer.putShort((short) sample);
    }
    return outputBuffer.array();
  }

  private static final class PcmAudio {
    final byte[] bytes;
    final int sampleRate;

    PcmAudio(byte[] bytes, int sampleRate) {
      this.bytes = bytes;
      this.sampleRate = sampleRate;
    }
  }
}
