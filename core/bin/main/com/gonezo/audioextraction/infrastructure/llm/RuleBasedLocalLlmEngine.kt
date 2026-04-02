package com.gonezo.audioextraction.infrastructure.llm

import java.time.Instant
import java.util.LinkedHashSet
import java.util.Locale
import java.util.regex.Pattern
import org.json.JSONArray
import org.json.JSONObject

class RuleBasedLocalLlmEngine : LlmEngine {
  override fun infer(prompt: String): String {
    val input = JSONObject(prompt)
    val transcript = input.optString("transcript", "")
    val normalized = transcript.lowercase(Locale.ROOT)

    var type = "expense"
    if (normalized.contains("income") || normalized.contains("salary") || normalized.contains("pay")) {
      type = "income"
    } else if (normalized.contains("transfer")) {
      type = "transfer"
    }

    val amountMatcher = Pattern.compile("([-+]?\\d+[\\d.,]*)").matcher(transcript)
    var amount: Double? = null
    if (amountMatcher.find()) {
      val parsed = amountMatcher.group(1).replace(",", ".")
      amount = parsed.toDoubleOrNull()
    }

    val tags = LinkedHashSet<String>()
    val tagMatcher = Pattern.compile("#([\\p{L}\\p{N}_-]+)").matcher(transcript)
    while (tagMatcher.find()) {
      tags.add(tagMatcher.group(1))
    }

    val result = JSONObject()
    val fieldCandidates = JSONObject()
    fieldCandidates.put("type", candidateArray(type, 0.82, transcript))
    fieldCandidates.put("occurredAt", candidateArray(Instant.now().toString(), 0.50, transcript))
    fieldCandidates.put("note", candidateArray(transcript, 0.90, transcript))

    if (amount != null) {
      fieldCandidates.put("amount", candidateArray(amount, 0.78, amountMatcher.group(1)))
    }

    if (tags.isNotEmpty()) {
      fieldCandidates.put("tagNames", candidateArray(tags.joinToString(","), 0.60, transcript))
    }

    result.put("fieldCandidates", fieldCandidates)
    return result.toString()
  }

  private fun candidateArray(value: Any, confidence: Double, evidenceText: String): JSONArray {
    val evidence = JSONObject()
    evidence.put("text", evidenceText)

    val evidenceArray = JSONArray()
    evidenceArray.put(evidence)

    val candidate = JSONObject()
    candidate.put("value", value)
    candidate.put("confidence", confidence)
    candidate.put("evidence", evidenceArray)

    return JSONArray().put(candidate)
  }
}
