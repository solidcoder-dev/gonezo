package com.gonezo.multiplatform.core;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

final class CoreDatabase extends SQLiteOpenHelper {
  private static final String DB_NAME = "gonezo.db";
  // Must never go backwards for existing installs. 7 existed before the ledger-only reset.
  private static final int DB_VERSION = 9;

  CoreDatabase(Context context) {
    super(context, DB_NAME, null, DB_VERSION);
  }

  @Override
  public void onConfigure(SQLiteDatabase db) {
    db.setForeignKeyConstraintsEnabled(true);
  }

  @Override
  public void onCreate(SQLiteDatabase db) {
    createTables(db);
  }

  @Override
  public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    if (oldVersion < 8) {
      dropTables(db);
      createTables(db);
      return;
    }

    if (oldVersion < 9) {
      createTaxonomyTables(db);
    }
  }

  @Override
  public void onDowngrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    dropTables(db);
    createTables(db);
  }

  private static void createTables(SQLiteDatabase db) {
    createLedgerTables(db);
    createTaxonomyTables(db);
  }

  private static void createLedgerTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists ledger_accounts (" +
        "id text primary key," +
        "name text not null," +
        "type text not null," +
        "currency text not null," +
        "status text not null," +
        "created_at text not null," +
        "archived_at text" +
      ");"
    );

    db.execSQL(
      "create table if not exists ledger_transactions (" +
        "id text primary key," +
        "account_id text not null," +
        "type text not null," +
        "amount text not null," +
        "currency text not null," +
        "occurred_at text not null," +
        "description text," +
        "merchant text," +
        "category_id text," +
        "status text not null," +
        "linked_transaction_id text," +
        "foreign key(account_id) references ledger_accounts(id)" +
      ");"
    );

    db.execSQL(
      "create table if not exists ledger_transaction_items (" +
        "id text primary key," +
        "transaction_id text not null," +
        "name text not null," +
        "amount text not null," +
        "currency text not null," +
        "category_id text," +
        "note text," +
        "foreign key(transaction_id) references ledger_transactions(id) on delete cascade" +
      ");"
    );
  }

  private static void createTaxonomyTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists taxonomy_categories (" +
        "id text primary key," +
        "name text not null," +
        "name_normalized text not null," +
        "applies_to text not null," +
        "status text not null," +
        "created_at text not null," +
        "archived_at text" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_taxonomy_categories_name_applies " +
        "on taxonomy_categories(name_normalized, applies_to);"
    );

    db.execSQL(
      "create table if not exists taxonomy_transaction_assignments (" +
        "transaction_id text primary key," +
        "category_id text not null," +
        "assigned_at text not null" +
      ");"
    );

    db.execSQL(
      "create index if not exists idx_taxonomy_assignments_category_id " +
        "on taxonomy_transaction_assignments(category_id);"
    );
  }

  private static void dropTables(SQLiteDatabase db) {
    db.execSQL("drop table if exists taxonomy_transaction_assignments");
    db.execSQL("drop table if exists taxonomy_categories");
    db.execSQL("drop table if exists ledger_transaction_items");
    db.execSQL("drop table if exists ledger_transactions");
    db.execSQL("drop table if exists ledger_accounts");
  }
}
