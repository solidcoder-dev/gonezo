package com.gonezo.multiplatform.plugins.speech

internal interface WhisperNativeBridgeApi {
  fun initContext(modelPath: String): Long
  fun freeContext(context: Long)
  fun isMultilingual(context: Long): Boolean
  fun languageId(language: String): Int
  fun transcribe(context: Long, threads: Int, language: String?, detectLanguageAutomatically: Boolean, samples: FloatArray): String
  fun cancel(context: Long)
}

internal object WhisperNativeBridge : WhisperNativeBridgeApi {
  private const val LIBRARY_NAME = "gonezo_whisper_jni"

  init {
    System.loadLibrary(LIBRARY_NAME)
  }

  external override fun initContext(modelPath: String): Long
  external override fun freeContext(context: Long)
  external override fun isMultilingual(context: Long): Boolean
  external override fun languageId(language: String): Int
  external override fun transcribe(context: Long, threads: Int, language: String?, detectLanguageAutomatically: Boolean, samples: FloatArray): String
  external override fun cancel(context: Long)
}
