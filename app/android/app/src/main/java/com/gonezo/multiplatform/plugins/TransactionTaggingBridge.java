package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;

final class TransactionTaggingBridge {

  private TransactionTaggingBridge() {
    throw new IllegalStateException("Utility class");
  }

  static JSObject applyTagsToTransaction(Context context, String transactionId, JSONArray tagNames) throws JSONException {
    LinkedHashMap<String, String> uniqueByNormalizedName = new LinkedHashMap<>();
    if (tagNames != null) {
      for (int index = 0; index < tagNames.length(); index++) {
        String rawTag = tagNames.optString(index, "").trim();
        if (rawTag.isEmpty()) {
          continue;
        }
        String normalizedTag = rawTag.toLowerCase(Locale.ROOT);
        if (!uniqueByNormalizedName.containsKey(normalizedTag)) {
          uniqueByNormalizedName.put(normalizedTag, rawTag);
        }
      }
    }

    AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(context);
    AndroidTaxonomyCore.TaxonomyTaggingResultView tagging =
      core.applyTagsToTransaction(transactionId, new ArrayList<>(uniqueByNormalizedName.values()));

    JSObject result = new JSObject();
    result.put("status", tagging.status());
    if (tagging.errorCode() != null) {
      result.put("errorCode", tagging.errorCode());
    }
    if (tagging.errorMessage() != null) {
      result.put("errorMessage", tagging.errorMessage());
    }
    JSONArray resolvedTagIds = new JSONArray();
    for (String tagId : tagging.tagIds()) {
      resolvedTagIds.put(tagId);
    }
    result.put("tagIds", resolvedTagIds);
    return result;
  }
}
