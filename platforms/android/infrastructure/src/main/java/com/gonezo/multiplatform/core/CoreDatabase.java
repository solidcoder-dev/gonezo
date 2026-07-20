package com.gonezo.multiplatform.core;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public final class CoreDatabase extends SQLiteOpenHelper {
  private static final String DB_NAME = "gonezo.db";
  // Must never go backwards for existing installs. 7 existed before the ledger-only reset.
  private static final int DB_VERSION = 29;

  CoreDatabase(Context context) {
    this(context, DB_NAME);
  }

  CoreDatabase(Context context, String databaseName) {
    super(context, databaseName, null, DB_VERSION);
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

    if (oldVersion < 20) {
      createSharingTables(db);
    }

    if (oldVersion < 21) {
      seedMasterCategories(db);
    }

    if (oldVersion >= 16 && oldVersion < 22) {
      addExpectedMovementItemTemplateTraceabilityColumn(db);
    }

    if (oldVersion < 23) {
      createRecurringSharingTables(db);
    }

    if (oldVersion < 24) {
      addPlannedSharePayerPartsColumn(db);
    }

    if (oldVersion < 25) {
      createExpectedPostingIdempotencyTable(db);
    }

    if (oldVersion < 26) {
      addExpectedPostingCompletionStatus(db);
    }
    if (oldVersion < 27) {
      addExpectedItemTemplateIdentityIndex(db);
    }
    if (oldVersion < 28) {
      addNextExpectedPostingId(db);
    }
    if (oldVersion < 29) {
      addRecurringAndExpectedTagColumns(db);
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
    seedMasterCategories(db);
    createTaxonomyTagTables(db);
    createMobillsImportTables(db);
    createRecurrenceTables(db);
    createExpectedMovementTables(db);
    createRecurringMovementItemTables(db);
    createExpectedMovementItemTables(db);
    createUserPreferencesTables(db);
    createSharingTables(db);
    createRecurringSharingTables(db);
    addPlannedSharePayerPartsColumn(db);
    createExpectedPostingIdempotencyTable(db);
    addExpectedPostingCompletionStatus(db);
    addExpectedItemTemplateIdentityIndex(db);
    addNextExpectedPostingId(db);
    addRecurringAndExpectedTagColumns(db);
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

  private static void addExpectedMovementItemTemplateTraceabilityColumn(SQLiteDatabase db) {
    db.execSQL("alter table expected_movement_items add column source_template_item_id text;");
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

  private static void seedMasterCategories(SQLiteDatabase db) {
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000101", "Bills", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000102", "Groceries", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000103", "Dining", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000104", "Transport", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000105", "Health", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000106", "Shopping", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000107", "Entertainment", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000108", "Travel", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000109", "Other", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000110", "Beauty", "expense");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000201", "Work Income", "income");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000202", "Investments", "income");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000203", "Reimbursements", "income");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000204", "Gifts & Benefits", "income");
    seedMasterCategory(db, "00000000-0000-4000-8000-000000000205", "Other", "income");
  }

  private static void seedMasterCategory(SQLiteDatabase db, String id, String name, String appliesTo) {
    String normalizedName = name.trim().toLowerCase();
    db.execSQL(
      "insert or ignore into taxonomy_categories " +
        "(id, name, name_normalized, applies_to, status, created_at, archived_at) " +
        "values (?, ?, ?, ?, 'active', '2026-07-13T00:00:00Z', null)",
      new Object[] {id, name, normalizedName, appliesTo}
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
        "tag_names text not null default '[]'," +
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
        "tag_names text not null default '[]'," +
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
        "source_template_item_id text," +
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

  private static void createSharingTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists sharing_persons (" +
        "id text primary key," +
        "display_name text not null," +
        "normalized_name text not null," +
        "created_at text not null," +
        "archived_at text" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_sharing_persons_normalized_active " +
        "on sharing_persons(normalized_name) where archived_at is null;"
    );

    db.execSQL(
      "create table if not exists sharing_expense_shares (" +
        "id text primary key," +
        "source_transaction_id text not null," +
        "payer_person_id text not null," +
        "total_amount text not null," +
        "currency text not null," +
        "created_at text not null," +
        "updated_at text not null," +
        "foreign key(source_transaction_id) references ledger_transactions(id) on delete cascade," +
        "foreign key(payer_person_id) references sharing_persons(id)" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_sharing_expense_shares_source_transaction " +
        "on sharing_expense_shares(source_transaction_id);"
    );

    db.execSQL(
      "create table if not exists sharing_expense_share_participants (" +
        "id text primary key," +
        "share_id text not null," +
        "person_id text not null," +
        "amount text not null," +
        "reimbursable integer not null," +
        "expected_movement_id text," +
        "foreign key(share_id) references sharing_expense_shares(id) on delete cascade," +
        "foreign key(person_id) references sharing_persons(id)," +
        "foreign key(expected_movement_id) references expected_movements(id)" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_sharing_share_participants_person " +
        "on sharing_expense_share_participants(share_id, person_id);"
    );

    db.execSQL(
      "create index if not exists idx_sharing_share_participants_expected " +
        "on sharing_expense_share_participants(expected_movement_id) where expected_movement_id is not null;"
    );

    db.execSQL(
      "create table if not exists analytics_exclusions (" +
        "id text primary key," +
        "scope_type text not null," +
        "scope_id text not null," +
        "reason text not null," +
        "created_at text not null" +
      ");"
    );

    db.execSQL(
      "create unique index if not exists uq_analytics_exclusions_scope_reason " +
        "on analytics_exclusions(scope_type, scope_id, reason);"
    );
  }

  private static void createRecurringSharingTables(SQLiteDatabase db) {
    db.execSQL("create table if not exists sharing_recurring_plans (" +
      "id text primary key, recurring_movement_ref text not null, payer_person_id text not null, " +
      "mode text not null check (mode in ('parts', 'amounts')), currency text not null, payer_parts integer, " +
      "created_at text not null, updated_at text not null, " +
      "foreign key(payer_person_id) references sharing_persons(id), " +
      "check ((mode = 'parts' and payer_parts is not null and payer_parts > 0) or " +
      "(mode = 'amounts' and payer_parts is null)));");
    db.execSQL("create unique index if not exists uq_sharing_recurring_plans_movement " +
      "on sharing_recurring_plans(recurring_movement_ref);");
    db.execSQL("create index if not exists idx_sharing_recurring_plans_payer " +
      "on sharing_recurring_plans(payer_person_id);");
    db.execSQL("create table if not exists sharing_recurring_plan_participants (" +
      "id text primary key, plan_id text not null, person_id text not null, participant_parts integer, " +
      "fixed_amount text, reimbursable integer not null check (reimbursable in (0, 1)), " +
      "participant_order integer not null, foreign key(plan_id) references sharing_recurring_plans(id) on delete cascade, " +
      "foreign key(person_id) references sharing_persons(id), " +
      "check ((participant_parts is not null and participant_parts > 0 and fixed_amount is null) or " +
      "(participant_parts is null and fixed_amount is not null and cast(fixed_amount as real) > 0)));");
    db.execSQL("create unique index if not exists uq_sharing_recurring_plan_participant_person " +
      "on sharing_recurring_plan_participants(plan_id, person_id);");
    db.execSQL("create unique index if not exists uq_sharing_recurring_plan_participant_order " +
      "on sharing_recurring_plan_participants(plan_id, participant_order);");
    db.execSQL("create index if not exists idx_sharing_recurring_plan_participants_plan " +
      "on sharing_recurring_plan_participants(plan_id, participant_order);");
    db.execSQL("create table if not exists sharing_planned_expense_shares (" +
      "id text primary key, expected_movement_ref text not null, source_plan_id text not null, payer_person_id text not null, " +
      "mode text not null check (mode in ('parts', 'amounts')), payer_parts integer, total_amount text not null, currency text not null, " +
      "status text not null check (status in ('pending', 'materialized', 'cancelled')), " +
      "materialized_transaction_ref text, materialized_share_ref text, created_at text not null, updated_at text not null, " +
      "foreign key(source_plan_id) references sharing_recurring_plans(id), foreign key(payer_person_id) references sharing_persons(id), " +
      "check ((status = 'materialized' and materialized_transaction_ref is not null and materialized_share_ref is not null) or " +
      "(status <> 'materialized' and materialized_transaction_ref is null and materialized_share_ref is null)));");
    db.execSQL("create unique index if not exists uq_sharing_planned_expense_expected " +
      "on sharing_planned_expense_shares(expected_movement_ref);");
    db.execSQL("create unique index if not exists uq_sharing_planned_expense_transaction " +
      "on sharing_planned_expense_shares(materialized_transaction_ref) where materialized_transaction_ref is not null;");
    db.execSQL("create index if not exists idx_sharing_planned_expense_plan " +
      "on sharing_planned_expense_shares(source_plan_id);");
    db.execSQL("create index if not exists idx_sharing_planned_expense_status " +
      "on sharing_planned_expense_shares(status, expected_movement_ref);");
    db.execSQL("create table if not exists sharing_planned_expense_share_participants (" +
      "id text primary key, planned_share_id text not null, person_id text not null, participant_parts integer, amount text not null, " +
      "reimbursable integer not null check (reimbursable in (0, 1)), participant_order integer not null, " +
      "foreign key(planned_share_id) references sharing_planned_expense_shares(id) on delete cascade, " +
      "foreign key(person_id) references sharing_persons(id));");
    db.execSQL("create unique index if not exists uq_sharing_planned_share_participant_person " +
      "on sharing_planned_expense_share_participants(planned_share_id, person_id);");
    db.execSQL("create unique index if not exists uq_sharing_planned_share_participant_order " +
      "on sharing_planned_expense_share_participants(planned_share_id, participant_order);");
    db.execSQL("create index if not exists idx_sharing_planned_share_participants_share " +
      "on sharing_planned_expense_share_participants(planned_share_id, participant_order);");
  }

  private static void addPlannedSharePayerPartsColumn(SQLiteDatabase db) {
    try {
      db.execSQL("alter table sharing_planned_expense_shares add column payer_parts integer;");
    } catch (android.database.sqlite.SQLiteException ignored) {
    }
    db.execSQL("update sharing_planned_expense_shares set payer_parts = (select payer_parts from sharing_recurring_plans where sharing_recurring_plans.id = sharing_planned_expense_shares.source_plan_id) where payer_parts is null;");
  }

  private static void createExpectedPostingIdempotencyTable(SQLiteDatabase db) {
    db.execSQL("create table if not exists expected_posting_attempts (" +
      "idempotency_key text primary key, expected_movement_id text not null unique, " +
      "transaction_id text not null, share_id text, completed_at text not null, " +
      "foreign key(expected_movement_id) references expected_movements(id), " +
      "foreign key(transaction_id) references ledger_transactions(id));");
  }

  private static void addExpectedPostingCompletionStatus(SQLiteDatabase db) {
    try {
      db.execSQL("alter table expected_posting_attempts add column completion_status text not null default 'completed'");
    } catch (android.database.sqlite.SQLiteException ignored) {
    }
    db.execSQL(
      "create unique index if not exists uq_expected_posting_attempts_expected_success " +
        "on expected_posting_attempts(expected_movement_id, completion_status) " +
        "where completion_status = 'completed'"
    );
  }

  private static void addExpectedItemTemplateIdentityIndex(SQLiteDatabase db) {
    db.execSQL("create unique index if not exists uq_expected_item_template_per_occurrence on expected_movement_items(expected_movement_id, source_template_item_id) where source_template_item_id is not null");
  }

  private static void addNextExpectedPostingId(SQLiteDatabase db) {
    try {
      db.execSQL("alter table expected_posting_attempts add column next_expected_movement_id text");
    } catch (android.database.sqlite.SQLiteException ignored) {
    }
    db.execSQL("create index if not exists idx_expected_posting_attempts_next_expected on expected_posting_attempts(next_expected_movement_id)");
  }

  private static void addRecurringAndExpectedTagColumns(SQLiteDatabase db) {
    if (!hasColumn(db, "recurring_movements", "tag_names")) {
      db.execSQL("alter table recurring_movements add column tag_names text not null default '[]'");
    }
    if (!hasColumn(db, "expected_movements", "tag_names")) {
      db.execSQL("alter table expected_movements add column tag_names text not null default '[]'");
    }
  }

  private static boolean hasColumn(SQLiteDatabase db, String table, String column) {
    try (android.database.Cursor cursor = db.rawQuery("pragma table_info(" + table + ")", null)) {
      int nameIndex = cursor.getColumnIndexOrThrow("name");
      while (cursor.moveToNext()) {
        if (column.equals(cursor.getString(nameIndex))) {
          return true;
        }
      }
      return false;
    }
  }

  private static void addRecurringMovementCategoryColumn(SQLiteDatabase db) {
    db.execSQL("alter table recurring_movements add column category_id text;");
  }

  private static void dropTables(SQLiteDatabase db) {
    db.execSQL("drop table if exists expected_movements");
    db.execSQL("drop table if exists expected_movement_items");
    db.execSQL("drop table if exists analytics_exclusions");
    db.execSQL("drop table if exists sharing_expense_share_participants");
    db.execSQL("drop table if exists sharing_expense_shares");
    db.execSQL("drop table if exists sharing_planned_expense_share_participants");
    db.execSQL("drop table if exists sharing_planned_expense_shares");
    db.execSQL("drop table if exists sharing_recurring_plan_participants");
    db.execSQL("drop table if exists sharing_recurring_plans");
    db.execSQL("drop table if exists sharing_persons");
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
