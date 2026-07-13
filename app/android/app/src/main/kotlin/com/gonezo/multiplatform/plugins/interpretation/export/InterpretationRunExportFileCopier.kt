package com.gonezo.multiplatform.plugins.interpretation.export

import android.net.Uri
import java.io.File
import java.io.IOException
import java.io.OutputStream

internal class InterpretationRunExportFileCopier {
  fun copy(
    archiveFile: File,
    destination: Uri,
    openOutputStream: (Uri) -> OutputStream?,
  ) {
    val outputStream = openOutputStream(destination)
      ?: throw IOException("Unable to open export destination.")

    outputStream.use { output ->
      archiveFile.inputStream().use { input ->
        input.copyTo(output)
        output.flush()
      }
    }
  }
}
