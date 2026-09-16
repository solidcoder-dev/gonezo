package com.gonezo.multiplatform.plugins.interpretation.worker

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

class SchemaGuidedInterpretationWorkerServiceTest {
  @Test
  fun `captures the reply messenger before launching asynchronous work`() {
    val source = File("src/main/kotlin/com/gonezo/multiplatform/plugins/interpretation/worker/SchemaGuidedInterpretationWorkerService.kt").readText()

    assertTrue(source.contains("val replyTo = message.replyTo"))
    assertTrue(source.contains("sendSuccess(replyTo"))
    assertTrue(source.contains("sendFailure(replyTo"))
    assertTrue(!source.contains("sendSuccess(message.replyTo"))
    assertTrue(!source.contains("sendFailure(\n              message.replyTo"))
  }
}
