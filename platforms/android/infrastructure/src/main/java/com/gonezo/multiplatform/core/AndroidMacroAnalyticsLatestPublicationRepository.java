package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

public final class AndroidMacroAnalyticsLatestPublicationRepository {
  private final CoreDatabase database;

  public AndroidMacroAnalyticsLatestPublicationRepository(CoreDatabase database) {
    this.database = database;
  }

  public String find(String contributorId, String period) {
    try (Cursor cursor = database.getReadableDatabase().query(
        "macro_analytics_latest_publications", new String[] {"publication_json"},
        "contributor_id = ? and period = ?", new String[] {contributorId, period}, null, null, null)) {
      return cursor.moveToFirst() ? cursor.getString(0) : null;
    }
  }

  public List<String> list(String period) {
    List<String> publications = new ArrayList<>();
    try (Cursor cursor = database.getReadableDatabase().query(
        "macro_analytics_latest_publications", new String[] {"publication_json"},
        "period = ?", new String[] {period}, null, null, "contributor_id")) {
      while (cursor.moveToNext()) publications.add(cursor.getString(0));
    }
    return publications;
  }

  public void save(String publicationJson) throws Exception {
    JSONObject publication = new JSONObject(publicationJson);
    ContentValues values = new ContentValues();
    values.put("contributor_id", publication.getString("contributorId"));
    values.put("period", publication.getJSONObject("period").getString("value"));
    values.put("revision", publication.getInt("revision"));
    values.put("publication_json", publicationJson);
    database.getWritableDatabase().insertWithOnConflict(
        "macro_analytics_latest_publications", null, values, SQLiteDatabase.CONFLICT_REPLACE);
  }
}
