package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import com.gonezo.multiplatform.audioextraction.domain.model.Evidence;
import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class StrictJsonOutputParser implements OutputParser {
  @Override
  public Map<String, List<FieldCandidate>> parse(String output) {
    try {
      JSONObject root = new JSONObject(output);
      JSONObject fieldCandidates = root.optJSONObject("fieldCandidates");
      if (fieldCandidates == null) {
        throw new AudioExtractionException(ErrorCode.PARSING_FAILED, "fieldCandidates object is required");
      }

      Map<String, List<FieldCandidate>> parsed = new LinkedHashMap<>();
      java.util.Iterator<String> keys = fieldCandidates.keys();
      while (keys.hasNext()) {
        String fieldName = keys.next();
        JSONArray candidatesArray = fieldCandidates.optJSONArray(fieldName);
        if (candidatesArray == null) {
          throw new AudioExtractionException(ErrorCode.PARSING_FAILED, "Candidates array is required for field: " + fieldName);
        }

        List<FieldCandidate> candidates = new ArrayList<>();
        for (int index = 0; index < candidatesArray.length(); index++) {
          JSONObject candidateJson = candidatesArray.optJSONObject(index);
          if (candidateJson == null) {
            throw new AudioExtractionException(ErrorCode.PARSING_FAILED, "Candidate must be an object at index " + index);
          }
          if (!candidateJson.has("value") || !candidateJson.has("confidence") || !candidateJson.has("evidence")) {
            throw new AudioExtractionException(ErrorCode.PARSING_FAILED, "Candidate must contain value/confidence/evidence");
          }

          double confidence = candidateJson.optDouble("confidence", -1D);
          if (confidence < 0D || confidence > 1D) {
            throw new AudioExtractionException(ErrorCode.PARSING_FAILED, "confidence must be in [0,1]");
          }

          JSONArray evidenceArray = candidateJson.optJSONArray("evidence");
          if (evidenceArray == null) {
            throw new AudioExtractionException(ErrorCode.PARSING_FAILED, "evidence must be an array");
          }

          List<Evidence> evidenceList = new ArrayList<>();
          for (int evidenceIndex = 0; evidenceIndex < evidenceArray.length(); evidenceIndex++) {
            JSONObject evidenceJson = evidenceArray.optJSONObject(evidenceIndex);
            if (evidenceJson == null || !evidenceJson.has("text")) {
              throw new AudioExtractionException(ErrorCode.PARSING_FAILED, "Evidence must be an object with text");
            }
            evidenceList.add(new Evidence(
              evidenceJson.optString("text", ""),
              evidenceJson.optLong("startMs", 0L),
              evidenceJson.optLong("endMs", 0L)
            ));
          }

          candidates.add(new FieldCandidate(
            fieldName,
            candidateJson.opt("value"),
            confidence,
            evidenceList
          ));
        }
        parsed.put(fieldName, candidates);
      }

      return parsed;
    } catch (JSONException ex) {
      throw new AudioExtractionException(ErrorCode.PARSING_FAILED, "LLM output is not valid JSON", ex);
    }
  }
}
