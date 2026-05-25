package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;

final class TaxonomyPluginHandler {
  private final Context context;

  TaxonomyPluginHandler(Context context) {
    this.context = context;
  }

  void taxonomyListCategories(PluginCall call) {
    try {
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(context);
      JSONArray items = new JSONArray();
      for (AndroidTaxonomyCore.TaxonomyCategoryView category : core.listCategories(
        call.getString("appliesTo"),
        call.getBoolean("includeArchived")
      )) {
        JSObject item = new JSObject();
        item.put("id", category.id());
        item.put("name", category.name());
        item.put("appliesTo", category.appliesTo());
        item.put("status", category.status());
        items.put(item);
      }

      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void taxonomyCreateCategory(PluginCall call) {
    try {
      String id = AndroidTaxonomyCore.getInstance(context)
        .createCategory(call.getString("name"), call.getString("appliesTo"))
        .toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void taxonomyRenameCategory(PluginCall call) {
    try {
      AndroidTaxonomyCore.getInstance(context).renameCategory(call.getString("categoryId"), call.getString("name"));
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void taxonomyListTags(PluginCall call) {
    try {
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(context);
      JSONArray items = new JSONArray();
      for (AndroidTaxonomyCore.TaxonomyTagView tag : core.listTags(call.getBoolean("includeArchived"))) {
        JSObject item = new JSObject();
        item.put("id", tag.id());
        item.put("name", tag.name());
        item.put("status", tag.status());
        items.put(item);
      }

      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void taxonomyRenameTag(PluginCall call) {
    try {
      AndroidTaxonomyCore.getInstance(context).renameTag(call.getString("tagId"), call.getString("name"));
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void orchestrationCategorizeTransaction(PluginCall call) {
    try {
      AndroidTaxonomyCore.TaxonomyCategorizationResultView categorization =
        AndroidTaxonomyCore.getInstance(context).categorizeTransaction(
          call.getString("transactionId"),
          call.getString("transactionType"),
          call.getString("categoryId")
        );

      JSObject result = new JSObject();
      result.put("status", categorization.status());
      if (categorization.categoryId() != null) {
        result.put("categoryId", categorization.categoryId());
      }
      if (categorization.errorCode() != null) {
        result.put("errorCode", categorization.errorCode());
      }
      if (categorization.errorMessage() != null) {
        result.put("errorMessage", categorization.errorMessage());
      }
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void orchestrationApplyTransactionTags(PluginCall call) {
    String transactionId = call.getString("transactionId");
    if (transactionId == null || transactionId.trim().isEmpty()) {
      call.reject("transactionId is required");
      return;
    }

    try {
      call.resolve(TransactionTaggingBridge.applyTagsToTransaction(context, transactionId, call.getArray("tagNames")));
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void orchestrationListTransactionTaxonomy(PluginCall call) {
    JSONArray transactionIds = call.getArray("transactionIds");
    try {
      JSONArray items = new JSONArray();
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(context);
      List<String> requestedTransactionIds = new ArrayList<>();
      if (transactionIds != null) {
        for (int index = 0; index < transactionIds.length(); index++) {
          String transactionId = transactionIds.optString(index, "").trim();
          if (!transactionId.isEmpty()) {
            requestedTransactionIds.add(transactionId);
          }
        }

        Map<String, AndroidTaxonomyCore.TransactionTaxonomyView> taxonomy =
          core.listTransactionTaxonomy(requestedTransactionIds);
        for (int index = 0; index < transactionIds.length(); index++) {
          String transactionId = transactionIds.optString(index, "").trim();
          if (transactionId.isEmpty()) {
            continue;
          }
          JSObject item = new JSObject();
          item.put("transactionId", transactionId);

          AndroidTaxonomyCore.TransactionTaxonomyView view = taxonomy.get(transactionId);
          String categoryId = view == null ? null : view.categoryId();
          if (categoryId != null && !categoryId.trim().isEmpty()) {
            item.put("categoryId", categoryId);
          }
          item.put("categorizationStatus", view == null ? "none" : view.categorizationStatus());

          JSONArray tagIds = new JSONArray();
          List<String> tags = view == null ? List.of() : view.tagIds();
          for (String tagId : tags) {
            tagIds.put(tagId);
          }
          item.put("tagIds", tagIds);
          item.put("taggingStatus", view == null ? "none" : view.taggingStatus());
          items.put(item);
        }
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }
}
