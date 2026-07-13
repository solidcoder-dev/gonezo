package dev.solidcoder.interpretation.json

import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldResult
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationIssue
import dev.solidcoder.interpretation.domain.InterpretationIssueLevel
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import dev.solidcoder.interpretation.domain.StructuredValue
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.application.UnstructuredText
import dev.solidcoder.interpretation.domain.ContextEntry
import dev.solidcoder.interpretation.domain.ContextKey
import dev.solidcoder.interpretation.domain.InterpretationContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

class InterpretationJsonCodec {
  fun encodeSpec(spec: InterpretationSpec): String = JSONObject()
    .put("contractVersion", CONTRACT_VERSION)
    .put("specId", spec.id.value)
    .put("version", spec.version.value)
    .put("fields", JSONArray(spec.fields.map(::encodeFieldSpec)))
    .toString()

  fun decodeSpec(json: String): InterpretationSpec {
    val root = parseRoot(json)
    requireKeys(root, setOf("contractVersion", "specId", "version", "fields"))
    require(root.getString("contractVersion") == CONTRACT_VERSION) { "unsupported interpretation JSON contract version" }
    val values = root.getJSONArray("fields")
    return InterpretationSpec(
      id = InterpretationSpecId.of(root.getString("specId")),
      version = InterpretationSpecVersion.of(root.getString("version")),
      fields = buildList(values.length()) {
        for (index in 0 until values.length()) add(decodeFieldSpec(values.getJSONObject(index)))
      },
    )
  }

  fun encodeRequest(request: InterpretationRequest): String = JSONObject()
    .put("contractVersion", CONTRACT_VERSION)
    .put("input", request.input.value)
    .put("inputLanguage", request.inputLanguage)
    .put("spec", JSONObject(encodeSpec(request.spec)))
    .put("context", encodeContext(request.context))
    .toString()

  fun decodeRequest(json: String): InterpretationRequest {
    val root = parseRoot(json)
    requireKeys(root, setOf("contractVersion", "input", "inputLanguage", "spec", "context"))
    requireContractVersion(root)
    return InterpretationRequest(
      input = UnstructuredText.of(root.getString("input")),
      inputLanguage = root.getString("inputLanguage"),
      spec = decodeSpec(root.getJSONObject("spec").toString()),
      context = decodeContext(root.getJSONObject("context")),
    )
  }

  fun encodeResult(result: InterpretationResult): String = JSONObject()
    .put("contractVersion", CONTRACT_VERSION)
    .put("specId", result.specId.value)
    .put("version", result.specVersion.value)
    .put("fields", JSONArray(result.fields.map(::encodeFieldResult)))
    .put("issues", JSONArray(result.issues.map(::encodeIssue)))
    .toString()

  fun decodeResult(json: String): InterpretationResult {
    val root = parseRoot(json)
    requireKeys(root, setOf("contractVersion", "specId", "version", "fields"), setOf("issues"))
    require(root.getString("contractVersion") == CONTRACT_VERSION) { "unsupported interpretation JSON contract version" }
    val fieldValues = root.getJSONArray("fields")
    val issueValues = root.optJSONArray("issues")
    val fields = buildList(fieldValues.length()) {
      for (index in 0 until fieldValues.length()) add(decodeFieldResult(fieldValues.getJSONObject(index)))
    }
    require(fields.map { it.key }.distinct().size == fields.size) { "interpretation JSON field keys must be unique" }
    return InterpretationResult.fromDecoded(
      specId = InterpretationSpecId.of(root.getString("specId")),
      specVersion = InterpretationSpecVersion.of(root.getString("version")),
      fields = fields,
      issues = issueValues?.let(::decodeIssues) ?: emptyList(),
    )
  }

  fun decodeFieldInterpretation(json: String): FieldInterpretation {
    val root = parseRoot(json)
    return try {
      decodeInterpretation(root)
    } catch (exception: IllegalArgumentException) {
      throw exception
    } catch (exception: RuntimeException) {
      throw IllegalArgumentException("invalid field interpretation JSON", exception)
    }
  }

  private fun encodeFieldSpec(field: FieldSpec): JSONObject = JSONObject()
    .put("key", field.key.value)
    .put("description", field.description.value)
    .put("type", field.type.name)
    .put("required", field.required)
    .put("format", field.format)
    .put("allowedValues", JSONArray(field.allowedValues.map(::encodeAllowedValue)))

  private fun decodeFieldSpec(json: JSONObject): FieldSpec {
    requireKeys(json, setOf("key", "description", "type"), setOf("required", "format", "allowedValues"))
    return FieldSpec(
      key = FieldKey.of(json.getString("key")),
      description = FieldDescription.of(json.getString("description")),
      type = enumValue(json.getString("type"), "field type"),
      required = json.optBoolean("required", false),
      format = json.optString("format").takeIf { it.isNotBlank() },
      allowedValues = json.optJSONArray("allowedValues")?.let(::decodeAllowedValues) ?: emptyList(),
    )
  }

  private fun encodeContext(context: InterpretationContext): JSONObject = JSONObject()
    .put("entries", JSONArray(context.entries.map { entry ->
      JSONObject()
        .put("key", entry.key.value)
        .put("value", encodeValue(entry.value))
    }))

  private fun decodeContext(json: JSONObject): InterpretationContext {
    requireKeys(json, setOf("entries"))
    val entries = json.getJSONArray("entries")
    return InterpretationContext(buildList(entries.length()) {
      for (index in 0 until entries.length()) {
        val entry = entries.getJSONObject(index)
        requireKeys(entry, setOf("key", "value"))
        add(ContextEntry(ContextKey.of(entry.getString("key")), decodeValue(entry.getJSONObject("value"))))
      }
    })
  }

  private fun encodeAllowedValue(value: AllowedValue): JSONObject = JSONObject()
    .put("stableValue", value.stableValue)
    .put("label", value.label)
    .put("description", value.description)

  private fun decodeAllowedValues(values: JSONArray): List<AllowedValue> = buildList(values.length()) {
    for (index in 0 until values.length()) {
      val value = values.getJSONObject(index)
      requireKeys(value, setOf("stableValue", "label"), setOf("description"))
      add(AllowedValue(value.getString("stableValue"), value.getString("label"), value.optString("description").takeIf { it.isNotBlank() }))
    }
  }

  private fun encodeFieldResult(field: FieldResult): JSONObject = JSONObject()
    .put("key", field.key.value)
    .put("interpretation", encodeInterpretation(field.interpretation))

  private fun decodeFieldResult(json: JSONObject): FieldResult {
    requireKeys(json, setOf("key", "interpretation"))
    return FieldResult(
      key = FieldKey.of(json.getString("key")),
      interpretation = decodeInterpretation(json.getJSONObject("interpretation")),
    )
  }

  private fun encodeInterpretation(value: FieldInterpretation): JSONObject = when (value) {
    is FieldInterpretation.Resolved -> JSONObject().put("kind", "resolved").put("candidate", encodeCandidate(value.candidate))
    is FieldInterpretation.Ambiguous -> JSONObject().put("kind", "ambiguous").put("candidates", JSONArray(value.candidates.map(::encodeCandidate)))
    FieldInterpretation.Missing -> JSONObject().put("kind", "missing")
  }

  private fun decodeInterpretation(json: JSONObject): FieldInterpretation {
    val kind = json.getString("kind")
    return when (kind) {
      "resolved" -> {
        requireKeys(json, setOf("kind", "candidate"))
        FieldInterpretation.Resolved(decodeCandidate(json.getJSONObject("candidate")))
      }
      "ambiguous" -> {
        requireKeys(json, setOf("kind", "candidates"))
        json.getJSONArray("candidates").let { values -> FieldInterpretation.Ambiguous(buildList(values.length()) { for (index in 0 until values.length()) add(decodeCandidate(values.getJSONObject(index))) }) }
      }
      "missing" -> {
        requireKeys(json, setOf("kind"))
        FieldInterpretation.Missing
      }
      else -> error("unknown field interpretation kind")
    }
  }

  private fun encodeCandidate(candidate: FieldCandidate): JSONObject = JSONObject()
    .put("value", encodeValue(candidate.value))
    .put("confidence", candidate.confidence.value)
    .put("rationale", candidate.rationale)

  private fun decodeCandidate(json: JSONObject): FieldCandidate {
    requireKeys(json, setOf("value", "confidence"), setOf("rationale"))
    return FieldCandidate(
      value = decodeValue(json.getJSONObject("value")),
      confidence = Confidence.of(json.getDouble("confidence")),
      rationale = json.optString("rationale").takeIf { it.isNotBlank() },
    )
  }

  private fun encodeValue(value: StructuredValue): JSONObject = when (value) {
    is StructuredValue.Text -> JSONObject().put("type", "text").put("value", value.value)
    is StructuredValue.Decimal -> JSONObject().put("type", "decimal").put("value", value.value.toPlainString())
    is StructuredValue.Date -> JSONObject().put("type", "date").put("value", value.value.toString())
    is StructuredValue.Enum -> JSONObject().put("type", "enum").put("value", value.stableValue)
    is StructuredValue.BooleanValue -> JSONObject().put("type", "boolean").put("value", value.value)
    is StructuredValue.Integer -> JSONObject().put("type", "integer").put("value", value.value)
  }

  private fun decodeValue(json: JSONObject): StructuredValue {
    requireKeys(json, setOf("type", "value"))
    return when (json.getString("type")) {
      "text" -> StructuredValue.Text(json.getString("value"))
      "decimal" -> StructuredValue.Decimal(json.getString("value").toBigDecimal())
      "date" -> StructuredValue.Date(LocalDate.parse(json.getString("value")))
      "enum" -> StructuredValue.Enum(json.getString("value"))
      "boolean" -> StructuredValue.BooleanValue(json.getBoolean("value"))
      "integer" -> StructuredValue.Integer(json.getLong("value"))
      else -> error("unknown structured value type")
    }
  }

  private fun encodeIssue(issue: InterpretationIssue): JSONObject = JSONObject()
    .put("code", issue.code)
    .put("message", issue.message)
    .put("level", issue.level.name)
    .put("fieldKey", issue.fieldKey?.value)

  private fun decodeIssues(values: JSONArray): List<InterpretationIssue> = buildList(values.length()) {
    for (index in 0 until values.length()) {
      val issue = values.getJSONObject(index)
      requireKeys(issue, setOf("code", "message"), setOf("level", "fieldKey"))
      add(InterpretationIssue(
        code = issue.getString("code"),
        message = issue.getString("message"),
        level = enumValue(issue.optString("level", InterpretationIssueLevel.WARNING.name), "issue level"),
        fieldKey = issue.optString("fieldKey").takeIf { it.isNotBlank() }?.let(FieldKey::of),
      ))
    }
  }

  private inline fun <reified T : Enum<T>> enumValue(raw: String, label: String): T = try {
    enumValueOf<T>(raw)
  } catch (exception: IllegalArgumentException) {
    throw IllegalArgumentException("unknown $label $raw", exception)
  }

  private fun parseRoot(json: String): JSONObject = try {
    JSONObject(json)
  } catch (exception: RuntimeException) {
    throw IllegalArgumentException("invalid interpretation JSON", exception)
  }

  private fun requireContractVersion(json: JSONObject) {
    require(json.getString("contractVersion") == CONTRACT_VERSION) {
      "unsupported interpretation JSON contract version"
    }
  }

  private fun requireKeys(json: JSONObject, required: Set<String>, optional: Set<String> = emptySet()) {
    val expectedKeys = required + optional
    val actualKeys = json.keys().asSequence().toSet()
    require(actualKeys.containsAll(required) && actualKeys.all { it in expectedKeys }) {
      "interpretation JSON properties are not compatible with ${expectedKeys.sorted()}"
    }
  }

  companion object {
    const val CONTRACT_VERSION = "1"
  }
}
