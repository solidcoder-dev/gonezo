package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.investments.Asset;
import com.gonezo.domain.investments.ports.AssetRepository;
import java.util.UUID;

final class AndroidAssetRepository implements AssetRepository {
  private final CoreDatabase db;

  AndroidAssetRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public Asset get(UUID id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "assets",
      new String[] {"id", "symbol_or_name", "asset_type", "currency"},
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Asset not found: " + id);
      }
      return new Asset(
        UUID.fromString(cursor.getString(0)),
        cursor.getString(1),
        cursor.getString(2),
        cursor.getString(3)
      );
    } finally {
      cursor.close();
    }
  }

  void save(Asset asset) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", asset.getId().toString());
    values.put("symbol_or_name", asset.getSymbolOrName());
    values.put("asset_type", asset.getAssetType());
    values.put("currency", asset.getCurrency());

    long result = database.insertWithOnConflict("assets", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save asset: " + asset.getId());
    }
  }
}
