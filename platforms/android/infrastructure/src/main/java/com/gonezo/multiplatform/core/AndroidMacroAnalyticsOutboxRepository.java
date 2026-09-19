package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

public final class AndroidMacroAnalyticsOutboxRepository {
  private final CoreDatabase database;

  public AndroidMacroAnalyticsOutboxRepository(CoreDatabase database) {
    this.database = database;
  }

  public String get(String ownerId, String period) {
    try (Cursor cursor = database.getReadableDatabase().query(
        "macro_analytics_outbox", new String[] {"publication_json"}, "owner_id = ? and period = ?",
        new String[] {ownerId, period}, null, null, null)) {
      return cursor.moveToFirst() ? cursor.getString(0) : null;
    }
  }

  public void save(String ownerId, String publicationJson) throws Exception {
    JSONObject publication = new JSONObject(publicationJson);
    String period = publication.getJSONObject("period").getString("value");
    int revision = publication.getInt("revision");
    ContentValues values = new ContentValues();
    values.put("owner_id", ownerId);
    values.put("period", period);
    values.put("revision", revision);
    values.put("publication_json", publicationJson);
    database.getWritableDatabase().insertWithOnConflict(
        "macro_analytics_outbox", null, values, SQLiteDatabase.CONFLICT_REPLACE);
  }

  public void migrate(String ownerId, String publicationJson) throws Exception {
    JSONObject incoming = new JSONObject(publicationJson);
    String period = incoming.getJSONObject("period").getString("value");
    String existingJson = get(ownerId, period);
    if (existingJson == null) {
      save(ownerId, publicationJson);
      return;
    }
    JSONObject existing = new JSONObject(existingJson);
    int existingRevision = existing.getInt("revision");
    int incomingRevision = incoming.getInt("revision");
    if (existingRevision > incomingRevision) return;
    if (existingRevision == incomingRevision) {
      if (!canonicalJson(existing).equals(canonicalJson(incoming))) {
        throw new IllegalStateException("Legacy analytics publication revision conflict");
      }
      return;
    }
    save(ownerId, publicationJson);
  }

  private static String canonicalJson(Object value) throws Exception {
    if (value instanceof JSONObject) {
      JSONObject object = (JSONObject) value;
      java.util.List<String> keys = new java.util.ArrayList<>();
      java.util.Iterator<String> iterator = object.keys();
      while (iterator.hasNext()) keys.add(iterator.next());
      java.util.Collections.sort(keys);
      StringBuilder canonical = new StringBuilder("{");
      for (String key : keys) {
        if (canonical.length() > 1) canonical.append(',');
        Object nestedValue = object.get(key);
        if (nestedValue instanceof org.json.JSONArray && "currencies".equals(key)) {
          nestedValue = sorted((org.json.JSONArray) nestedValue, "currency", null);
        } else if (nestedValue instanceof org.json.JSONArray && "buckets".equals(key)) {
          nestedValue = sorted((org.json.JSONArray) nestedValue, "source", "kind");
        }
        canonical.append(JSONObject.quote(key)).append(':').append(canonicalJson(nestedValue));
      }
      return canonical.append('}').toString();
    }
    if (value instanceof org.json.JSONArray) {
      org.json.JSONArray array = (org.json.JSONArray) value;
      StringBuilder canonical = new StringBuilder("[");
      for (int index = 0; index < array.length(); index++) {
        if (index > 0) canonical.append(',');
        canonical.append(canonicalJson(array.get(index)));
      }
      return canonical.append(']').toString();
    }
    if (value == JSONObject.NULL) return "null";
    if (value instanceof String) return JSONObject.quote((String) value);
    return String.valueOf(value);
  }

  private static org.json.JSONArray sorted(org.json.JSONArray values, String primaryKey, String secondaryKey) {
    List<JSONObject> objects = new ArrayList<>();
    for (int index = 0; index < values.length(); index++) {
      JSONObject object = values.optJSONObject(index);
      if (object != null) objects.add(object);
    }
    objects.sort((left, right) -> {
      int primaryComparison = left.optString(primaryKey).compareTo(right.optString(primaryKey));
      if (primaryComparison != 0 || secondaryKey == null) return primaryComparison;
      return left.optString(secondaryKey).compareTo(right.optString(secondaryKey));
    });
    org.json.JSONArray sorted = new org.json.JSONArray();
    for (JSONObject object : objects) sorted.put(object);
    return sorted;
  }

  public void remove(String ownerId, String period) {
    database.getWritableDatabase().delete("macro_analytics_outbox", "owner_id = ? and period = ?", new String[] {ownerId, period});
  }

  public List<String> listPending(String ownerId) {
    List<String> publications = new ArrayList<>();
    try (Cursor cursor = database.getReadableDatabase().query(
        "macro_analytics_outbox", new String[] {"publication_json"}, "owner_id = ?",
        new String[] {ownerId}, null, null, "period asc")) {
      while (cursor.moveToNext()) publications.add(cursor.getString(0));
    }
    return publications;
  }

  public void clear(String ownerId) {
    database.getWritableDatabase().delete("macro_analytics_outbox", "owner_id = ?", new String[] {ownerId});
  }
}
