package com.gonezo.audioextraction.infrastructure.transcription.whisper;

public final class WhisperNativeBridge {
  private static final String LIB_NAME = "gonezo_whisper_jni";

  static {
    System.loadLibrary(LIB_NAME);
  }

  private WhisperNativeBridge() {
  }

  public static long initContext(String modelPath) {
    return initContextNative(modelPath);
  }

  public static void freeContext(long contextPtr) {
    freeContextNative(contextPtr);
  }

  public static int fullTranscribe(long contextPtr, int numThreads, String language, float[] audioData) {
    return fullTranscribeNative(contextPtr, numThreads, language, audioData);
  }

  public static int getTextSegmentCount(long contextPtr) {
    return getTextSegmentCountNative(contextPtr);
  }

  public static String getTextSegment(long contextPtr, int index) {
    return getTextSegmentNative(contextPtr, index);
  }

  public static String getSystemInfo() {
    return getSystemInfoNative();
  }

  private static native long initContextNative(String modelPath);

  private static native void freeContextNative(long contextPtr);

  private static native int fullTranscribeNative(long contextPtr, int numThreads, String language, float[] audioData);

  private static native int getTextSegmentCountNative(long contextPtr);

  private static native String getTextSegmentNative(long contextPtr, int index);

  private static native String getSystemInfoNative();
}
