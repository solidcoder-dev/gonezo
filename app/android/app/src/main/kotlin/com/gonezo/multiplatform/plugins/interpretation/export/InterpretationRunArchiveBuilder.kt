package com.gonezo.multiplatform.plugins.interpretation.export

import java.io.File

interface InterpretationRunArchiveBuilder {
  fun build(runId: String): File
}
