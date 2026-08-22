package com.gonezo.multiplatform.infrastructure.processing.litert.runtime

import com.gonezo.multiplatform.BuildConfig
import java.io.File

internal class QualcommLiteRtRuntimeBundle(
  private val nativeLibraryDir: File,
  private val logger: InterpretationRuntimeLogger,
) {
  fun validateBeforeNpuInitialization() {
    val missingLibraries = requiredLibraries.filterNot { File(nativeLibraryDir, it).isFile }
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
