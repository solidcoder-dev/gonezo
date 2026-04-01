package com.gonezo.multiplatform.audioextraction.infrastructure.contract;

import android.content.Context;
import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

public final class SchemaAssetLoader {
  private final Context context;
  private final Map<String, JSONObject> cache = new HashMap<>();

  public SchemaAssetLoader(Context context) {
    this.context = context.getApplicationContext();
  }

  public JSONObject load(String assetPath) {
    if (cache.containsKey(assetPath)) {
      return cache.get(assetPath);
    }

    try (BufferedReader reader = new BufferedReader(new InputStreamReader(
      context.getAssets().open(assetPath),
      StandardCharsets.UTF_8
    ))) {
      StringBuilder content = new StringBuilder();
      String line;
      while ((line = reader.readLine()) != null) {
        content.append(line).append('\n');
      }
      JSONObject schema = new JSONObject(content.toString());
      cache.put(assetPath, schema);
      return schema;
    } catch (IOException | JSONException ex) {
      throw new AudioExtractionException(
        ErrorCode.INVALID_REQUEST,
        "Cannot load schema asset: " + assetPath,
        ex
      );
    }
  }
}
