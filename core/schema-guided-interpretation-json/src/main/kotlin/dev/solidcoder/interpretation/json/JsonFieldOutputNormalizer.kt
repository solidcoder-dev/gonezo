package dev.solidcoder.interpretation.json

class JsonFieldOutputNormalizer {
  fun normalize(raw: String): String {
    val copy = raw.trim()
    require(copy.isNotEmpty()) { "structured generation output is empty" }
    if (!copy.startsWith("`")) {
      return copy
    }
    require(copy.startsWith("```") && copy.endsWith("```")) { "structured generation output must be raw JSON" }
    require(copy.indexOf("```", 3) == copy.length - 3) { "structured generation output must contain a single outer fence" }

    val body = copy.substring(3, copy.length - 3)
    val normalizedBody = when {
      body.startsWith("json\n", ignoreCase = true) -> body.substringAfter('\n')
      body.startsWith('\n') -> body.drop(1)
      else -> throw IllegalArgumentException("structured generation output must place JSON on the next line")
    }
    require(normalizedBody.isNotBlank()) { "structured generation output is empty" }
    require(!normalizedBody.contains("```")) { "structured generation output must not contain nested fences" }
    return normalizedBody
  }
}
