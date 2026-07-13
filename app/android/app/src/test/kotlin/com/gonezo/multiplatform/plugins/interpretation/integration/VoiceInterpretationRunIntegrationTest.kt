package com.gonezo.multiplatform.plugins.interpretation.integration

import com.gonezo.multiplatform.plugins.interpretation.application.ExecuteSchemaGuidedInterpretation
import com.gonezo.multiplatform.plugins.interpretation.artifacts.AndroidPrivateInterpretationArtifactStore
import com.gonezo.multiplatform.plugins.interpretation.artifacts.AudioArtifactMetadata
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactClock
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactCleanupPolicy
import dev.solidcoder.interpretation.application.FieldInterpretationAttempt
import dev.solidcoder.interpretation.application.InputSource
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.application.InterpretationOutcome
import dev.solidcoder.interpretation.application.InputInterpreter
import dev.solidcoder.interpretation.application.FieldInterpretationAttemptStatus
import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.ContextEntry
import dev.solidcoder.interpretation.domain.ContextKey
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationContext
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.StructuredValue
import dev.solidcoder.interpretation.json.InterpretationJsonCodec
import java.io.File
import java.nio.file.Files
import java.time.LocalDate
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class VoiceInterpretationRunIntegrationTest {
  @Test
  fun persistsTheAndroidRunAndInterpretsItThroughThePortableLLMFlow() = runBlocking {
    val baseDirectory = Files.createTempDirectory("gonezo-voice-interpretation").toFile()
    val clock = FixedClock(1_700_000_000_000)
    val artifactStore = AndroidPrivateInterpretationArtifactStore(
      baseDirectory = baseDirectory,
      clock = clock,
      cleanupPolicy = InterpretationArtifactCleanupPolicy.DEFAULT,
      deleteDirectoryTree = { directory: File -> directory.deleteRecursively() },
    )
    val codec = InterpretationJsonCodec()
    val interpreter = ExecuteSchemaGuidedInterpretation(
      inputInterpreter = fakeInterpreter(),
      codec = codec,
    )
    val runId = "11111111-1111-1111-1111-111111111111"
    val transcriptText = "Gasté 34,80 euros ayer en Comida"

    val audioFile = artifactStore.beginRun(runId, 1_700_000_000_000)
    audioFile.writeBytes(byteArrayOf(1, 2, 3, 4))
    artifactStore.completeAudio(runId, AudioArtifactMetadata("audio/wav", 2_000, 4))

    val transcriptJson = """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es","detectLanguageAutomatically":false},"result":{"transcript":{"text":"$transcriptText","segments":{"text":[],"startMs":[],"endMs":[],"noSpeechProbability":[]}},"issues":[]}}"""
    artifactStore.storeTranscript(runId, transcriptJson)

    val requestJson = codec.encodeRequest(
      InterpretationRequest(
        input = InputSource.of(transcriptText),
        inputLanguage = "es",
        spec = movementSpec(),
        context = InterpretationContext(
          entries = listOf(
            ContextEntry(ContextKey.of("currentDate"), StructuredValue.Date(LocalDate.parse("2026-07-15"))),
            ContextEntry(ContextKey.of("timeZone"), StructuredValue.Text("Atlantic/Canary")),
            ContextEntry(ContextKey.of("locale"), StructuredValue.Text("es-ES")),
            ContextEntry(ContextKey.of("currency"), StructuredValue.Text("EUR")),
          ),
        ),
      ),
    )

    val execution = interpreter.execute(requestJson)
    artifactStore.storeInterpretation(runId, requestJson, execution.resultJson, execution.attempts)

    val runDirectory = expectedRunDirectory(baseDirectory, runId)
    assertTrue(runDirectory.resolve("audio.wav").toFile().exists())
    assertTrue(runDirectory.resolve("transcript.v1.json").toFile().exists())
    assertTrue(runDirectory.resolve("interpretation.v1.json").toFile().exists())
    assertTrue(runDirectory.resolve("manifest.v1.json").toFile().exists())

    val manifest = JSONObject(runDirectory.resolve("manifest.v1.json").toFile().readText())
    assertEquals("interpreted", manifest.getString("status"))
    assertEquals(5, manifest.getJSONObject("interpretation").getInt("resolvedFieldCount"))
    assertEquals("usable", manifest.getJSONObject("interpretation").getString("quality"))

    val result = codec.decodeResult(execution.resultJson)
    assertEquals("expense", fieldValue(result, "type"))
    assertEquals("34.80", fieldValue(result, "amount"))
    assertEquals("2026-07-14", fieldValue(result, "occurredOn"))
    assertEquals(transcriptText, fieldValue(result, "note"))
    assertEquals("cat-food", fieldValue(result, "categoryId"))
    assertEquals(FieldInterpretationAttemptStatus.DECODED, execution.attempts.first().status)
  }

  private fun fakeInterpreter(): InputInterpreter = object : InputInterpreter {
    override suspend fun interpret(request: InterpretationRequest): InterpretationOutcome {
      return InterpretationOutcome.Success(
        InterpretationResult.forSpec(
          spec = request.spec,
          candidates = mapOf(
            "type" to FieldCandidate(StructuredValue.Enum("expense"), Confidence.of(0.95)),
            "amount" to FieldCandidate(StructuredValue.Decimal(java.math.BigDecimal("34.80")), Confidence.of(0.95)),
            "occurredOn" to FieldCandidate(StructuredValue.Date(LocalDate.of(2026, 7, 14)), Confidence.of(0.95)),
            "note" to FieldCandidate(StructuredValue.Text(request.input.value), Confidence.of(0.95)),
            "categoryId" to FieldCandidate(StructuredValue.Enum("cat-food"), Confidence.of(0.95)),
          ),
        ),
        attempts = request.spec.fields.mapIndexed { index, field ->
          FieldInterpretationAttempt(
            fieldKey = field.key,
            fieldIndex = index,
            attemptNumber = 1,
            promptVariant = FieldPromptVariant.PRIMARY,
            status = FieldInterpretationAttemptStatus.DECODED,
            durationMs = 10L + index,
            outputLength = 64 + index,
            raw = """{"kind":"resolved","field":"${field.key.value}"}""",
          )
        },
      )
    }
  }

  private fun movementSpec(): InterpretationSpec {
    return InterpretationSpec(
      id = InterpretationSpecId.of("gonezo-movement-entry"),
      version = InterpretationSpecVersion.of("1"),
      fields = listOf(
        FieldSpec(
          key = FieldKey.of("type"),
          description = FieldDescription.of("Financial direction expressed by the user"),
          type = FieldType.ENUM,
          allowedValues = listOf(
            AllowedValue("expense", "Expense"),
            AllowedValue("income", "Income"),
          ),
        ),
        FieldSpec(
          key = FieldKey.of("amount"),
          description = FieldDescription.of("Monetary amount explicitly mentioned by the user"),
          type = FieldType.DECIMAL,
        ),
        FieldSpec(
          key = FieldKey.of("occurredOn"),
          description = FieldDescription.of("Date when the event happened"),
          type = FieldType.DATE,
          required = true,
          format = "local-date",
        ),
        FieldSpec(
          key = FieldKey.of("note"),
          description = FieldDescription.of("Short note describing the movement"),
          type = FieldType.TEXT,
        ),
        FieldSpec(
          key = FieldKey.of("categoryId"),
          description = FieldDescription.of("Best matching category identifier among the supplied category candidates"),
          type = FieldType.ENUM,
          allowedValues = listOf(
            AllowedValue("cat-food", "Comida"),
          ),
        ),
      ),
    )
  }

  private fun fieldValue(result: InterpretationResult, key: String): String? {
    val field = result.fields.firstOrNull { it.key.value == key } ?: return null
    val interpretation = field.interpretation
    if (interpretation !is dev.solidcoder.interpretation.domain.FieldInterpretation.Resolved) {
      return null
    }

    return when (val value = interpretation.candidate.value) {
      is StructuredValue.Text -> value.value
      is StructuredValue.Decimal -> value.value.toPlainString()
      is StructuredValue.Date -> value.value.toString()
      is StructuredValue.Enum -> value.stableValue
      else -> value.toString()
    }
  }

  private fun expectedRunDirectory(baseDirectory: File, runId: String) = baseDirectory
    .toPath()
    .resolve("interpretation-runs")
    .resolve(runId)

  private class FixedClock(
    var nowEpochMs: Long,
  ) : InterpretationArtifactClock {
    override fun nowEpochMs(): Long = nowEpochMs
  }
}
