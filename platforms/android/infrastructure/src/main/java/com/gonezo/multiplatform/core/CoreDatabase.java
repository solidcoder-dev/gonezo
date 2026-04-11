package com.gonezo.multiplatform.core;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

final class CoreDatabase extends SQLiteOpenHelper {
  private static final String DB_NAME = "gonezo.db";
  // Must never go backwards for existing installs. 7 existed before the ledger-only reset.
  private static final int DB_VERSION = 12;

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

    if (oldVersion < 10) {
      createMobillsImportTables(db);
    }

    if (oldVersion < 11) {
      createTransactionVoiceAnalysisTables(db);
    }

    if (oldVersion < 12) {
      createRecurrenceTables(db);
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
    createMobillsImportTables(db);
    createTransactionVoiceAnalysisTables(db);
    createRecurrenceTables(db);
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

  private static void createMobillsImportTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists mobills_import_fingerprints (" +
        "source text not null," +
        "fingerprint text not null," +
        "transaction_id text not null," +
        "first_seen_at text not null," +
        "last_seen_at text not null," +
        "seen_count integer not null default 1," +
        "primary key(source, fingerprint)" +
      ");"
    );
  }

  private static void createTransactionVoiceAnalysisTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists transaction_voice_analysis (" +
        "analysis_id text primary key," +
        "recording_id text not null," +
        "recording_path text not null," +
        "account_id text not null," +
        "expected_type text not null," +
        "initial_draft_json text not null," +
        "created_at text not null," +
        "outcome text," +
        "transaction_ids_json text," +
        "final_draft_json text," +
        "error_message text," +
        "finalized_at text" +
      ");"
    );
  }

  private static void createRecurrenceTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists recurring_movements (" +
        "id text primary key," +
        "movement_type text not null," +
        "source_account_id text not null," +
        "target_account_id text," +
        "amount text not null," +
        "currency text not null," +
        "destination_amount text," +
        "destination_currency text," +
        "exchange_rate text," +
        "description text," +
        "merchant text," +
        "rule_frequency text not null," +
        "rule_interval integer not null," +
        "rule_weekdays text," +
        "rule_day_of_month integer," +
        "rule_monthly_pattern text not null," +
        "rule_monthly_nth integer," +
        "rule_monthly_weekday text," +
        "end_kind text not null," +
        "end_on_date text," +
        "end_after_occurrences integer," +
        "start_at text not null," +
        "zone_id text not null," +
        "next_due_at text," +
        "status text not null," +
        "generated_occurrences integer not null default 0," +
        "created_at text not null," +
        "updated_at text not null," +
        "deactivated_at text," +
        "completed_at text" +
      ");"
    );

    db.execSQL(
      "create index if not exists idx_recurring_movements_due " +
        "on recurring_movements(status, next_due_at);"
    );

    db.execSQL(
      "create index if not exists idx_recurring_movements_account " +
        "on recurring_movements(source_account_id, status);"
    );

    db.execSQL(
      "create table if not exists recurring_movement_occurrences (" +
        "id text primary key," +
        "recurring_movement_id text not null," +
        "due_at text not null," +
        "status text not null," +
        "ledger_transaction_id text," +
        "error_code text," +
        "error_message text," +
        "created_at text not null," +
        "updated_at text not null," +
        "acknowledged_at text," +
        "foreign key(recurring_movement_id) references recurring_movements(id)" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_recurring_occurrence_due " +
        "on recurring_movement_occurrences(recurring_movement_id, due_at);"
    );

    db.execSQL(
      "create index if not exists idx_recurring_occurrences_status " +
        "on recurring_movement_occurrences(status, due_at);"
    );

    db.execSQL(
      "create table if not exists recurrence_outbox (" +
        "id text primary key," +
        "aggregate_id text not null," +
        "occurrence_id text," +
        "event_type text not null," +
        "payload_json text not null," +
        "status text not null," +
        "attempts integer not null default 0," +
        "last_error text," +
        "created_at text not null," +
        "published_at text" +
      ");"
    );

    db.execSQL(
      "create index if not exists idx_recurrence_outbox_status " +
        "on recurrence_outbox(status, created_at);"
    );
  }

  private static void dropTables(SQLiteDatabase db) {
    db.execSQL("drop table if exists recurrence_outbox");
    db.execSQL("drop table if exists recurring_movement_occurrences");
    db.execSQL("drop table if exists recurring_movements");
    db.execSQL("drop table if exists transaction_voice_analysis");
    db.execSQL("drop table if exists mobills_import_fingerprints");
    db.execSQL("drop table if exists taxonomy_transaction_assignments");
    db.execSQL("drop table if exists taxonomy_categories");
    db.execSQL("drop table if exists ledger_transaction_items");
    db.execSQL("drop table if exists ledger_transactions");
    db.execSQL("drop table if exists ledger_accounts");
  }
}
