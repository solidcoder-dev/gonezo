package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.util.ArrayList;
import org.json.JSONArray;

final class TransactionItemTaggingBridge {
  private TransactionItemTaggingBridge() {}

  static JSObject applyTagsToItem(Context context, String itemId, JSONArray tagNames) throws Exception {
    ArrayList<String> names = new ArrayList<>();
    if (tagNames != null) for (int index = 0; index < tagNames.length(); index++) names.add(tagNames.optString(index, ""));
    AndroidTaxonomyCore.TaxonomyTaggingResultView result = AndroidTaxonomyCore.getInstance(context).applyTagsToTransactionItem(itemId, names);
    JSObject output = new JSObject();
    output.put("status", result.status());
    output.put("tagIds", new JSONArray(result.tagIds()));
    if (result.errorCode() != null) output.put("errorCode", result.errorCode());
    if (result.errorMessage() != null) output.put("errorMessage", result.errorMessage());
    return output;
  }
}
