package dev.solidcoder.interpretation.json

import dev.solidcoder.interpretation.application.FieldInterpretationPromptCompiler
import dev.solidcoder.interpretation.application.FieldOutputViolation
import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.InterpretationRequest
import dev.solidcoder.interpretation.application.StructuredGenerationRequest
import dev.solidcoder.interpretation.domain.ContextKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.StructuredValue
import org.json.JSONObject

class JsonFieldInterpretationPromptCompiler : FieldInterpretationPromptCompiler {
  override fun compile(
    request: InterpretationRequest,
    field: FieldSpec,
    variant: FieldPromptVariant,
    previousViolation: FieldOutputViolation?,
  ): StructuredGenerationRequest = StructuredGenerationRequest(
    prompt = when (variant) {
      FieldPromptVariant.PRIMARY -> primaryPrompt(request, field)
      FieldPromptVariant.FORMAT_RETRY -> retryPrompt(request, field, requireNotNull(previousViolation) { "previous violation is required for format retries" })
    },
    spec = request.spec,
  )

  private fun primaryPrompt(request: InterpretationRequest, field: FieldSpec): String = buildString {
    appendLine("Interpret one field and return a single JSON object.")
    appendFieldHeader(request, field, includeInput = true, includeDescription = true, includeRequired = true)
    appendLine(fieldRules(field))
    appendLine(outputContract())
  }

  private fun retryPrompt(
    request: InterpretationRequest,
    field: FieldSpec,
    previousViolation: FieldOutputViolation,
  ): String = buildString {
    appendLine("The previous response was invalid.")
    appendLine(retryCorrection(previousViolation))
    appendFieldHeader(request, field, includeInput = false, includeDescription = false, includeRequired = false)
    appendLine(fieldRules(field))
    appendLine(outputContract())
  }

  private fun StringBuilder.appendFieldHeader(
    request: InterpretationRequest,
    field: FieldSpec,
    includeInput: Boolean,
    includeDescription: Boolean,
    includeRequired: Boolean,
  ) {
    appendLine("inputLanguage: ${request.inputLanguage}")
    if (includeInput) {
      appendLine("input: ${request.input.value}")
    }
    appendLine("fieldKey: ${field.key.value}")
    appendLine("fieldType: ${field.type.name.lowercase()}")
    if (includeDescription) {
      appendLine("fieldDescription: ${field.description.value}")
    }
    if (includeRequired) {
      appendLine("required: ${field.required}")
    }
    field.format?.let { appendLine("format: $it") }
    appendLine(contextLine(field.type, request))
    if (field.type == FieldType.ENUM) {
      appendLine("Allowed aliases:")
      appendLine(allowedValues(field))
    }
  }

  private fun fieldRules(field: FieldSpec): String = when (field.type) {
    FieldType.DECIMAL -> buildString {
      appendLine("Decimal fields must extract only the monetary amount.")
      appendLine("Ignore product numbers, quantities, or indices such as the 95 in gasolina 95.")
      appendLine("VALUE must be a JSON number or a JSON string containing a number.")
      appendLine("If there is no explicit amount, return missing.")
    }
    FieldType.DATE -> buildString {
      appendLine("Date fields must use an ISO yyyy-MM-dd string only when the text contains temporal evidence.")
      appendLine("VALUE must be an ISO yyyy-MM-dd string.")
      appendLine("If there is no date, today, yesterday, or other temporal evidence, return exactly {\"kind\":\"missing\"}.")
      appendLine("Do not use currentDate as a default.")
    }
    FieldType.ENUM -> buildString {
      appendLine("Enum fields must choose only one of the listed aliases.")
      appendLine("Use labels only to choose the value.")
      appendLine("Never return labels, descriptions, stable values or UUIDs.")
      appendLine("Return only the selected alias as the value of the required result object.")
      appendLine("VALUE must be one of the listed aliases.")
      appendLine("If no alias can be selected, return missing or ambiguous.")
    }
    FieldType.TEXT -> buildString {
      appendLine("Text fields must return a brief string derived from the text.")
      appendLine("VALUE must be a brief JSON string.")
      appendLine("Do not copy instructions or add explanations.")
    }
    FieldType.BOOLEAN -> buildString {
      appendLine("Boolean fields must return a JSON boolean.")
      appendLine("VALUE must be a JSON boolean.")
    }
    FieldType.INTEGER -> buildString {
      appendLine("Integer fields must return a JSON integer.")
      appendLine("VALUE must be a JSON integer.")
    }
  }

  private fun outputContract(): String = buildString {
    appendLine("Allowed output shapes:")
    appendLine()
    appendLine("RESOLVED:")
    appendLine("""{"kind":"resolved","value":VALUE,"confidence":CONFIDENCE}""")
    appendLine()
    appendLine("MISSING:")
    appendLine("""{"kind":"missing"}""")
    appendLine()
    appendLine("AMBIGUOUS:")
    appendLine("""{"kind":"ambiguous","candidates":[{"value":VALUE,"confidence":CONFIDENCE},{"value":VALUE,"confidence":CONFIDENCE}]}""")
    appendLine()
    appendLine("Replace VALUE with a value of the required field type.")
    appendLine("Replace CONFIDENCE with a JSON number between 0 and 1.")
    appendLine("Never output the words VALUE or CONFIDENCE.")
    appendLine("Return exactly one JSON object.")
    appendLine("Do not return Markdown or additional properties.")
  }

  private fun retryCorrection(previousViolation: FieldOutputViolation): String = when (previousViolation) {
    FieldOutputViolation.WRONG_PROPERTIES -> "Use only the properties allowed by the contract."
    FieldOutputViolation.INVALID_KIND_SHAPE -> "Respect the JSON shape required by kind."
    FieldOutputViolation.INVALID_VALUE_TYPE -> "Use the JSON value type required by the field."
    FieldOutputViolation.UNKNOWN_ENUM_ALIAS -> "Use only one listed alias."
    FieldOutputViolation.INVALID_CONFIDENCE -> "Use a confidence number between 0 and 1."
    FieldOutputViolation.INVALID_DATE -> "Use ISO yyyy-MM-dd or missing."
    FieldOutputViolation.INVALID_CANDIDATES -> "Correct the candidates array so it contains two different valid candidates."
    FieldOutputViolation.UNKNOWN_KIND -> "Use resolved, missing, or ambiguous."
    FieldOutputViolation.INVALID_JSON -> "Return a single valid JSON object."
  }

  private fun contextLine(type: FieldType, request: InterpretationRequest): String = when (type) {
    FieldType.DATE -> "context: currentDate=${contextValue(request, "currentDate")}; timeZone=${contextValue(request, "timeZone")}"
    FieldType.DECIMAL -> "context: currency=${contextValue(request, "currency")}; locale=${contextValue(request, "locale")}"
    FieldType.TEXT -> "context: inputLanguage=${request.inputLanguage}"
    FieldType.ENUM -> "context: inputLanguage=${request.inputLanguage}"
    FieldType.BOOLEAN,
    FieldType.INTEGER -> "context: inputLanguage=${request.inputLanguage}"
  }

  private fun contextValue(request: InterpretationRequest, rawKey: String): String {
    val value = request.context.valueOf(ContextKey.of(rawKey))
    return when (value) {
      null -> "not provided"
      is StructuredValue.Text -> value.value
      is StructuredValue.Decimal -> value.value.toPlainString()
      is StructuredValue.Date -> value.value.toString()
      is StructuredValue.Enum -> value.stableValue
      is StructuredValue.BooleanValue -> value.value.toString()
      is StructuredValue.Integer -> value.value.toString()
    }
  }

  private fun allowedValues(field: FieldSpec): String {
    return buildString {
      AllowedValueAliasMap.from(field.allowedValues).allowedValues.forEachIndexed { index, alias ->
        if (index > 0) {
          appendLine()
        }
        append(alias.alias)
        append(" = ")
        append(alias.label)
      }
    }
  }
}
