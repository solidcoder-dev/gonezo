package com.gonezo.multiplatform.core;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

final class CoreDatabase extends SQLiteOpenHelper {
  private static final String DB_NAME = "gonezo.db";
  private static final int DB_VERSION = 1;

  CoreDatabase(Context context) {
    super(context, DB_NAME, null, DB_VERSION);
  }

  @Override
  public void onConfigure(SQLiteDatabase db) {
    db.setForeignKeyConstraintsEnabled(true);
  }

  @Override
  public void onCreate(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists accounts (" +
        "id text primary key," +
        "user_id text not null," +
        "name text not null," +
        "type text not null," +
        "currency text not null" +
      ");"
    );
  }

  @Override
  public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    // No-op for now. We'll add migrations once schema evolves.
  }
}
