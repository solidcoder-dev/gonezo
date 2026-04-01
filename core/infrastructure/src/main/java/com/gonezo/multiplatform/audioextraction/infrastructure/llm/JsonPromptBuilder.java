package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.domain.model.ExecutionPlan;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import com.gonezo.multiplatform.audioextraction.domain.schema.OutputSchema;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class JsonPromptBuilder implements PromptBuilder {
  @Override
  public String build(Transcript transcript, OutputSchema schema, ExecutionPlan plan) {
    JSONObject prompt = new JSONObject();
    put(prompt, "task", "Extract field candidates as strict JSON");
    put(prompt, "transcript", transcript.text());

    JSONObject fields = new JSONObject();
    for (Map.Entry<String, FieldSchema> entry : schema.fields().entrySet()) {
      JSONObject field = new JSONObject();
      put(field, "type", entry.getValue().type());
      if (entry.getValue().format() != null) {
        put(field, "format", entry.getValue().format());
      }
      if (!entry.getValue().enumValues().isEmpty()) {
        put(field, "enum", new JSONArray(entry.getValue().enumValues()));
      }
      put(field, "required", entry.getValue().required());
      put(fields, entry.getKey(), field);
    }
    put(prompt, "fields", fields);

    List<String> required = new ArrayList<>(plan.requiredFields());
    List<String> optional = new ArrayList<>(plan.optionalFields());
    put(prompt, "requiredFields", new JSONArray(required));
    put(prompt, "optionalFields", new JSONArray(optional));

    put(
      prompt,
      "outputFormat",
      "{\"fieldCandidates\": {\"<field>\": [{\"value\": <any>, \"confidence\": <0..1>, \"evidence\": [{\"text\": \"...\", \"startMs\": 0, \"endMs\": 0}]}]}}"
    );

    return prompt.toString();
  }

  private static void put(JSONObject target, String key, Object value) {
    try {
      target.put(key, value);
    } catch (JSONException ex) {
      throw new IllegalStateException("Cannot serialize prompt key " + key, ex);
    }
  }
}
