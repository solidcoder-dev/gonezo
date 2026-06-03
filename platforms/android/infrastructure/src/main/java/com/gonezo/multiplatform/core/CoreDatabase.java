package com.gonezo.multiplatform.core;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public final class CoreDatabase extends SQLiteOpenHelper {
  private static final String DB_NAME = "gonezo.db";
  // Must never go backwards for existing installs. 7 existed before the ledger-only reset.
  private static final int DB_VERSION = 19;

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

    if (oldVersion < 12) {
      createRecurrenceTables(db);
    }

    if (oldVersion < 13) {
      createTaxonomyTagTables(db);
    }

    if (oldVersion < 14) {
      createExpectedMovementTables(db);
    }

    if (oldVersion >= 12 && oldVersion < 15) {
      addRecurringMovementCategoryColumn(db);
    }

    if (oldVersion < 16) {
      createExpectedMovementItemTables(db);
      createRecurringMovementItemTables(db);
    }

    if (oldVersion < 17) {
      createUserPreferencesTables(db);
    }

    if (oldVersion < 18) {
      createLedgerIndexes(db);
    }

    if (oldVersion >= 12 && oldVersion < 19) {
      addRecurringMovementReviewPolicyColumn(db);
    }

    if (oldVersion >= 14 && oldVersion < 19) {
      addExpectedMovementOriginColumns(db);
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
    createTaxonomyTagTables(db);
    createMobillsImportTables(db);
    createRecurrenceTables(db);
    createExpectedMovementTables(db);
    createRecurringMovementItemTables(db);
    createExpectedMovementItemTables(db);
    createUserPreferencesTables(db);
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

    createLedgerIndexes(db);
  }

  private static void createLedgerIndexes(SQLiteDatabase db) {
    db.execSQL(
      "create index if not exists idx_ledger_transactions_account_occurred " +
        "on ledger_transactions(account_id, occurred_at desc);"
    );
    db.execSQL(
      "create index if not exists idx_ledger_transactions_account_status_occurred " +
        "on ledger_transactions(account_id, status, occurred_at desc);"
    );
    db.execSQL(
      "create index if not exists idx_ledger_transactions_account_merchant " +
        "on ledger_transactions(account_id, merchant);"
    );
    db.execSQL(
      "create index if not exists idx_ledger_items_transaction_id " +
        "on ledger_transaction_items(transaction_id);"
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

  private static void createTaxonomyTagTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists taxonomy_tags (" +
        "id text primary key," +
        "name text not null," +
        "name_normalized text not null," +
        "status text not null," +
        "created_at text not null," +
        "archived_at text" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_taxonomy_tags_name " +
        "on taxonomy_tags(name_normalized);"
    );

    db.execSQL(
      "create table if not exists taxonomy_transaction_tag_assignments (" +
        "transaction_id text not null," +
        "tag_id text not null," +
        "assigned_at text not null," +
        "primary key(transaction_id, tag_id)" +
      ");"
    );

    db.execSQL(
      "create index if not exists idx_taxonomy_transaction_tags_tx " +
        "on taxonomy_transaction_tag_assignments(transaction_id);"
    );

    db.execSQL(
      "create index if not exists idx_taxonomy_transaction_tags_tag " +
        "on taxonomy_transaction_tag_assignments(tag_id);"
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
        "category_id text," +
        "review_policy text not null default 'automatic'," +
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

  private static void createExpectedMovementTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists expected_movements (" +
        "id text primary key," +
        "account_id text not null," +
        "movement_type text not null," +
        "amount text not null," +
        "currency text not null," +
        "expected_at text not null," +
        "description text," +
        "merchant text," +
        "category_id text," +
        "origin_occurrence_id text," +
        "origin_recurring_movement_id text," +
        "status text not null," +
        "resolved_transaction_id text," +
        "created_at text not null," +
        "updated_at text not null," +
        "resolved_at text," +
        "dismissed_at text," +
      "foreign key(account_id) references ledger_accounts(id)" +
      ");"
    );

    db.execSQL(
      "create index if not exists idx_expected_movements_account_status_expected " +
        "on expected_movements(account_id, status, expected_at);"
    );

    db.execSQL(
      "create index if not exists idx_expected_movements_resolved_transaction " +
        "on expected_movements(resolved_transaction_id);"
    );

    db.execSQL(
      "create unique index if not exists uq_expected_movements_origin_occurrence " +
        "on expected_movements(origin_occurrence_id) where origin_occurrence_id is not null;"
    );

    db.execSQL(
      "create index if not exists idx_expected_movements_origin_recurring " +
        "on expected_movements(origin_recurring_movement_id) where origin_recurring_movement_id is not null;"
    );
  }

  private static void addRecurringMovementReviewPolicyColumn(SQLiteDatabase db) {
    db.execSQL("alter table recurring_movements add column review_policy text not null default 'automatic';");
  }

  private static void addExpectedMovementOriginColumns(SQLiteDatabase db) {
    db.execSQL("alter table expected_movements add column origin_occurrence_id text;");
    db.execSQL("alter table expected_movements add column origin_recurring_movement_id text;");
    db.execSQL(
      "create unique index if not exists uq_expected_movements_origin_occurrence " +
        "on expected_movements(origin_occurrence_id) where origin_occurrence_id is not null;"
    );
    db.execSQL(
      "create index if not exists idx_expected_movements_origin_recurring " +
        "on expected_movements(origin_recurring_movement_id) where origin_recurring_movement_id is not null;"
    );
  }

  private static void createExpectedMovementItemTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists expected_movement_items (" +
        "id text primary key," +
        "expected_movement_id text not null," +
        "item_order integer not null," +
        "name text not null," +
        "amount text not null," +
        "foreign key(expected_movement_id) references expected_movements(id) on delete cascade" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_expected_movement_items_order " +
        "on expected_movement_items(expected_movement_id, item_order);"
    );

    db.execSQL(
      "create index if not exists idx_expected_movement_items_expected " +
        "on expected_movement_items(expected_movement_id);"
    );
  }

  private static void createRecurringMovementItemTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists recurring_movement_items (" +
        "id text primary key," +
        "recurring_movement_id text not null," +
        "item_order integer not null," +
        "name text not null," +
        "amount text not null," +
        "foreign key(recurring_movement_id) references recurring_movements(id) on delete cascade" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_recurring_movement_items_order " +
        "on recurring_movement_items(recurring_movement_id, item_order);"
    );

    db.execSQL(
      "create index if not exists idx_recurring_movement_items_recurring " +
        "on recurring_movement_items(recurring_movement_id);"
    );
  }

  private static void createUserPreferencesTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists user_preferences (" +
        "owner_id text primary key," +
        "default_account_id text," +
        "updated_at text not null" +
      ");"
    );
  }

  private static void addRecurringMovementCategoryColumn(SQLiteDatabase db) {
    db.execSQL("alter table recurring_movements add column category_id text;");
  }

  private static void dropTables(SQLiteDatabase db) {
    db.execSQL("drop table if exists expected_movements");
    db.execSQL("drop table if exists expected_movement_items");
    db.execSQL("drop table if exists recurrence_outbox");
    db.execSQL("drop table if exists recurring_movement_occurrences");
    db.execSQL("drop table if exists recurring_movements");
    db.execSQL("drop table if exists recurring_movement_items");
    db.execSQL("drop table if exists user_preferences");
    db.execSQL("drop table if exists mobills_import_fingerprints");
    db.execSQL("drop table if exists taxonomy_transaction_tag_assignments");
    db.execSQL("drop table if exists taxonomy_tags");
    db.execSQL("drop table if exists taxonomy_transaction_assignments");
    db.execSQL("drop table if exists taxonomy_categories");
    db.execSQL("drop table if exists ledger_transaction_items");
    db.execSQL("drop table if exists ledger_transactions");
    db.execSQL("drop table if exists ledger_accounts");
  }
}
