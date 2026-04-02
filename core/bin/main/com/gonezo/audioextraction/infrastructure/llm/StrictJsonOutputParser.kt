package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import com.gonezo.audioextraction.domain.model.Evidence
import com.gonezo.audioextraction.domain.model.FieldCandidate
import org.json.JSONException
import org.json.JSONObject

class StrictJsonOutputParser : OutputParser {
  override fun parse(output: String): Map<String, List<FieldCandidate>> {
    try {
      val root = JSONObject(output)
      val fieldCandidates = root.optJSONObject("fieldCandidates")
        ?: throw AudioExtractionException(ErrorCode.PARSING_FAILED, "fieldCandidates object is required")

      val parsed = linkedMapOf<String, List<FieldCandidate>>()
      val keys = fieldCandidates.keys()
      while (keys.hasNext()) {
        val fieldName = keys.next()
        val candidatesArray = fieldCandidates.optJSONArray(fieldName)
          ?: throw AudioExtractionException(
            ErrorCode.PARSING_FAILED,
            "Candidates array is required for field: $fieldName",
          )

        val candidates = mutableListOf<FieldCandidate>()
        for (index in 0 until candidatesArray.length()) {
          val candidateJson = candidatesArray.optJSONObject(index)
            ?: throw AudioExtractionException(ErrorCode.PARSING_FAILED, "Candidate must be an object at index $index")

          if (!candidateJson.has("value") || !candidateJson.has("confidence") || !candidateJson.has("evidence")) {
            throw AudioExtractionException(ErrorCode.PARSING_FAILED, "Candidate must contain value/confidence/evidence")
          }

          val confidence = candidateJson.optDouble("confidence", -1.0)
          if (confidence < 0.0 || confidence > 1.0) {
            throw AudioExtractionException(ErrorCode.PARSING_FAILED, "confidence must be in [0,1]")
          }

          val evidenceArray = candidateJson.optJSONArray("evidence")
            ?: throw AudioExtractionException(ErrorCode.PARSING_FAILED, "evidence must be an array")

          val evidenceList = mutableListOf<Evidence>()
          for (evidenceIndex in 0 until evidenceArray.length()) {
            val evidenceJson = evidenceArray.optJSONObject(evidenceIndex)
            if (evidenceJson == null || !evidenceJson.has("text")) {
              throw AudioExtractionException(ErrorCode.PARSING_FAILED, "Evidence must be an object with text")
            }
            evidenceList.add(
              Evidence(
                evidenceJson.optString("text", ""),
                evidenceJson.optLong("startMs", 0L),
                evidenceJson.optLong("endMs", 0L),
              )
            )
          }

          candidates.add(FieldCandidate(fieldName, candidateJson.opt("value"), confidence, evidenceList))
        }
        parsed[fieldName] = candidates
      }

      return parsed
    } catch (ex: JSONException) {
      throw AudioExtractionException(ErrorCode.PARSING_FAILED, "LLM output is not valid JSON", ex)
    }
  }
}
