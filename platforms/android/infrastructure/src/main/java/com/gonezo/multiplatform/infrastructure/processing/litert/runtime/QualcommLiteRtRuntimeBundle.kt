package com.gonezo.multiplatform.infrastructure.processing.litert.runtime

import com.gonezo.multiplatform.BuildConfig
import java.io.File

internal class QualcommLiteRtRuntimeBundle(
  private val nativeLibraryDir: File,
  private val logger: InterpretationRuntimeLogger,
) {
  fun validateBeforeNpuInitialization() {
    val missingLibraries = missingLibraries()
    logger.log(
      TAG,
      "litertlm_version=${BuildConfig.LITERTLM_ANDROID_VERSION} " +
        "litert_source_commit=${BuildConfig.LITERT_SOURCE_COMMIT} " +
        "qairt_version=${BuildConfig.QAIRT_VERSION} " +
        "execution_target=NPU " +
        "soc_target=SM8750 " +
        "htp_architecture=${BuildConfig.QUALCOMM_NPU_HTP_ARCHITECTURE} " +
        "native_library_dir=$nativeLibraryDir " +
        "dispatch_library_present=${"libLiteRtDispatch_Qualcomm.so" !in missingLibraries}",
    )
    if (missingLibraries.isNotEmpty()) {
      throw IllegalStateException(
        "Qualcomm NPU runtime prerequisites missing: ${missingLibraries.joinToString(", ")}",
      )
    }
  }

  fun isAvailable(): Boolean = missingLibraries().isEmpty()

  private fun missingLibraries(): List<String> = requiredLibraries.filterNot { File(nativeLibraryDir, it).isFile }

  private companion object {
    const val TAG = "GonezoLiteRt"
    val requiredLibraries = listOf(
      "libLiteRtDispatch_Qualcomm.so",
      "libQnnSystem.so",
      "libQnnHtp.so",
      "libQnnHtpV79Stub.so",
      "libQnnHtpV79Skel.so",
    )
  }
}
