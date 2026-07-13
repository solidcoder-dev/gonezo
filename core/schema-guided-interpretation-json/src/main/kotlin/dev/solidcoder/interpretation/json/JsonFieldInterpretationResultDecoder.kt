package dev.solidcoder.interpretation.json

import dev.solidcoder.interpretation.application.FieldOutputDecodingException
import dev.solidcoder.interpretation.application.FieldOutputViolation
import dev.solidcoder.interpretation.application.FieldInterpretationResultDecoder
import dev.solidcoder.interpretation.application.StructuredGenerationResult
import dev.solidcoder.interpretation.domain.Confidence
import dev.solidcoder.interpretation.domain.FieldCandidate
import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.StructuredValue
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal
import java.time.LocalDate

class JsonFieldInterpretationResultDecoder(
  private val outputNormalizer: JsonFieldOutputNormalizer = JsonFieldOutputNormalizer(),
) : FieldInterpretationResultDecoder {
  override fun decode(field: FieldSpec, generationResult: StructuredGenerationResult): FieldInterpretation {
    val output = outputNormalizer.normalize(generationResult.output)
    val root = parseRoot(output)
    requireKeys(root, setOf("kind"), setOf("value", "confidence", "candidates"))
    return when (requireKind(root)) {
      "resolved" -> decodeResolved(field, root)
      "missing" -> decodeMissing(root)
      "ambiguous" -> decodeAmbiguous(field, root)
      else -> throw decodingFailure(FieldOutputViolation.UNKNOWN_KIND, "unknown field interpretation kind")
    }
  }

  private fun decodeResolved(field: FieldSpec, json: JSONObject): FieldInterpretation {
    requireKeys(json, setOf("kind", "value", "confidence"))
    return FieldInterpretation.Resolved(
      candidate = decodeCandidate(field, json.opt("value"), requireConfidence(json.opt("confidence"))),
    )
  }

  private fun decodeMissing(json: JSONObject): FieldInterpretation {
    requireKeys(json, setOf("kind"))
    return FieldInterpretation.Missing
  }

  private fun decodeAmbiguous(field: FieldSpec, json: JSONObject): FieldInterpretation {
    requireKeys(json, setOf("kind", "candidates"))
    val values = json.getJSONArray("candidates")
    if (values.length() < 2) {
      throw decodingFailure(FieldOutputViolation.INVALID_CANDIDATES, "ambiguous interpretation requires at least two candidates")
    }
    val candidates = buildList(values.length()) {
      for (index in 0 until values.length()) {
        val value = try {
          values.getJSONObject(index)
        } catch (exception: RuntimeException) {
          throw decodingFailure(FieldOutputViolation.INVALID_CANDIDATES, "ambiguous interpretation candidates must be objects", exception)
        }
        requireKeys(value, setOf("value", "confidence"))
        add(decodeCandidate(field, value.opt("value"), requireConfidence(value.opt("confidence"))))
      }
    }
    if (candidates.distinct().size != candidates.size) {
      throw decodingFailure(FieldOutputViolation.INVALID_CANDIDATES, "ambiguous interpretation candidates must be unique")
    }
    if (candidates.map { it.value }.distinct().size != candidates.size) {
      throw decodingFailure(FieldOutputViolation.INVALID_CANDIDATES, "ambiguous interpretation candidates must describe different values")
    }
    return FieldInterpretation.Ambiguous(candidates)
  }

  private fun decodeCandidate(field: FieldSpec, rawValue: Any?, confidence: Double): FieldCandidate {
    if (confidence !in 0.0..1.0) {
      throw decodingFailure(FieldOutputViolation.INVALID_CONFIDENCE, "confidence must be within 0..1")
    }
    val value = when (field.type) {
      FieldType.TEXT -> StructuredValue.Text(requireString(rawValue, FieldOutputViolation.INVALID_VALUE_TYPE, "text"))
      FieldType.DECIMAL -> StructuredValue.Decimal(requireDecimal(rawValue))
      FieldType.DATE -> StructuredValue.Date(requireDate(rawValue))
      FieldType.ENUM -> {
        val alias = requireString(rawValue, FieldOutputViolation.INVALID_VALUE_TYPE, "enum alias")
        val stableValue = try {
          AllowedValueAliasMap.from(field.allowedValues).stableValueForAlias(alias)
        } catch (exception: RuntimeException) {
          throw decodingFailure(FieldOutputViolation.UNKNOWN_ENUM_ALIAS, "enum alias must match one of the allowed aliases", exception)
        }
        StructuredValue.Enum(stableValue)
      }
      FieldType.BOOLEAN -> StructuredValue.BooleanValue(requireBoolean(rawValue, FieldOutputViolation.INVALID_VALUE_TYPE, "boolean"))
      FieldType.INTEGER -> StructuredValue.Integer(requireInteger(rawValue, FieldOutputViolation.INVALID_VALUE_TYPE, "integer"))
    }
    return FieldCandidate(
      value = value,
      confidence = Confidence.of(confidence),
    )
  }

  private fun requireString(rawValue: Any?, violation: FieldOutputViolation, label: String): String = when (rawValue) {
    is String -> rawValue
    else -> throw decodingFailure(violation, "$label must be a string")
  }

  private fun requireDecimal(rawValue: Any?): BigDecimal = when (rawValue) {
    is String,
    is Number -> parseBigDecimal(rawValue.toString(), "decimal")
    else -> throw decodingFailure(FieldOutputViolation.INVALID_VALUE_TYPE, "decimal must be a JSON number or string")
  }

  private fun requireBoolean(rawValue: Any?, violation: FieldOutputViolation, label: String): Boolean = when (rawValue) {
    is Boolean -> rawValue
    else -> throw decodingFailure(violation, "$label must be a boolean")
  }

  private fun requireInteger(rawValue: Any?, violation: FieldOutputViolation, label: String): Long = when (rawValue) {
    is Number -> {
      val decimal = parseBigDecimal(rawValue.toString(), label)
      if (decimal.scale() > 0) {
        throw decodingFailure(violation, "$label must be a JSON integer")
      }
      try {
        decimal.longValueExact()
      } catch (exception: ArithmeticException) {
        throw decodingFailure(violation, "$label must be a JSON integer", exception)
      }
    }
    else -> throw decodingFailure(violation, "$label must be a JSON integer")
  }

  private fun parseBigDecimal(rawValue: String, label: String): BigDecimal = try {
    rawValue.toBigDecimal()
  } catch (exception: RuntimeException) {
    throw decodingFailure(FieldOutputViolation.INVALID_VALUE_TYPE, "$label must be numeric", exception)
  }

  private fun parseRoot(json: String): JSONObject = try {
    JSONObject(json)
  } catch (exception: RuntimeException) {
    throw decodingFailure(FieldOutputViolation.INVALID_JSON, "invalid field interpretation JSON", exception)
  }

  private fun requireKeys(json: JSONObject, required: Set<String>, optional: Set<String> = emptySet()) {
    val expectedKeys = required + optional
    val actualKeys = json.keys().asSequence().toSet()
    if (!(actualKeys.containsAll(required) && actualKeys.all { it in expectedKeys })) {
      throw decodingFailure(FieldOutputViolation.WRONG_PROPERTIES, "interpretation JSON properties are not compatible with ${expectedKeys.sorted()}")
    }
  }

  private fun requireKind(json: JSONObject): String {
    if (!json.has("kind")) {
      throw decodingFailure(FieldOutputViolation.INVALID_KIND_SHAPE, "interpretation JSON kind is required")
    }
    val kind = json.opt("kind")
    if (kind !is String) {
      throw decodingFailure(FieldOutputViolation.INVALID_KIND_SHAPE, "interpretation JSON kind must be a string")
    }
    return kind
  }

  private fun requireDate(rawValue: Any?): LocalDate = when (rawValue) {
    is String -> try {
      LocalDate.parse(rawValue)
    } catch (exception: RuntimeException) {
      throw decodingFailure(FieldOutputViolation.INVALID_DATE, "date must be ISO yyyy-MM-dd", exception)
    }
    else -> throw decodingFailure(FieldOutputViolation.INVALID_VALUE_TYPE, "date must be a string")
  }

  private fun requireConfidence(rawValue: Any?): Double = when (rawValue) {
    is Number -> {
      val confidence = rawValue.toDouble()
      if (confidence !in 0.0..1.0) {
        throw decodingFailure(FieldOutputViolation.INVALID_CONFIDENCE, "confidence must be within 0..1")
      }
      confidence
    }
    else -> throw decodingFailure(FieldOutputViolation.INVALID_CONFIDENCE, "confidence must be a number")
  }

  private fun decodingFailure(violation: FieldOutputViolation, message: String, cause: Throwable? = null): FieldOutputDecodingException {
    return FieldOutputDecodingException(violation, message, cause)
  }
}
