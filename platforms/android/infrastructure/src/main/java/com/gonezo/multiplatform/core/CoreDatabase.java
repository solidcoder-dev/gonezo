package com.gonezo.multiplatform.core;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

final class CoreDatabase extends SQLiteOpenHelper {
  private static final String DB_NAME = "gonezo.db";
  private static final int DB_VERSION = 8;

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
    createTables(db);
  }

  private static void createTables(SQLiteDatabase db) {
    db.execSQL(
      "create table if not exists accounts (" +
        "id text primary key," +
        "user_id text not null," +
        "name text not null," +
        "type text not null," +
        "currency text not null" +
      ");"
    );
    db.execSQL(
      "create table if not exists transactions (" +
        "id text primary key," +
        "account_id text not null," +
        "posted_date text not null," +
        "effective_date text not null," +
        "amount text not null," +
        "currency text not null," +
        "type text not null," +
        "merchant text," +
        "category_id text," +
        "recurring integer not null" +
      ");"
    );
    db.execSQL(
      "create table if not exists budget_plans (" +
        "id text primary key," +
        "user_id text not null," +
        "period text not null," +
        "negative_policy text not null," +
        "reservation_policy text not null," +
        "effective_dating_policy text not null" +
      ");"
    );
    db.execSQL(
      "create table if not exists budget_periods (" +
        "id text primary key," +
        "budget_plan_id text not null," +
        "year integer not null," +
        "month integer not null," +
        "income_total_amount text not null," +
        "income_total_currency text not null," +
        "remainder_amount text not null," +
        "remainder_currency text not null," +
        "unique (budget_plan_id, year, month)" +
      ");"
    );
    db.execSQL(
      "create table if not exists categories (" +
        "id text primary key," +
        "budget_plan_id text not null," +
        "name text not null," +
        "type text not null," +
        "allow_negative integer not null," +
        "max_debt_amount text," +
        "max_debt_currency text" +
      ");"
    );
    db.execSQL(
      "create table if not exists allocation_rules (" +
        "id text primary key," +
        "budget_plan_id text not null," +
        "category_id text not null," +
        "percent_of_remainder text not null" +
      ");"
    );
    db.execSQL(
      "create table if not exists category_balances (" +
        "id text primary key," +
        "budget_period_id text not null," +
        "category_id text not null," +
        "opening_balance_amount text not null," +
        "opening_balance_currency text not null," +
        "allocated_amount text not null," +
        "allocated_currency text not null," +
        "spent_amount text not null," +
        "spent_currency text not null," +
        "available_amount text not null," +
        "available_currency text not null," +
        "reserved_amount text not null," +
        "reserved_currency text not null," +
        "safe_to_spend_amount text not null," +
        "safe_to_spend_currency text not null," +
        "unique (budget_period_id, category_id)" +
      ");"
    );
    db.execSQL(
      "create table if not exists recurring_patterns (" +
        "id text primary key," +
        "budget_plan_id text not null," +
        "category_id text not null," +
        "name text not null," +
        "cadence text not null," +
        "expected_amount text not null," +
        "expected_currency text not null," +
        "tolerance_amount text not null," +
        "tolerance_currency text not null," +
        "merchant_matcher text not null," +
        "billing_day integer," +
        "billing_month integer," +
        "proration text," +
        "active integer not null" +
      ");"
    );
    db.execSQL(
      "create table if not exists budget_reservations (" +
        "id text primary key," +
        "budget_period_id text not null," +
        "pattern_id text not null," +
        "category_id text not null," +
        "amount text not null," +
        "currency text not null," +
        "status text not null," +
        "expected_effective_date text not null," +
        "linked_transaction_id text," +
        "unique (budget_period_id, pattern_id)" +
      ");"
    );
    db.execSQL(
      "create table if not exists budget_links (" +
        "id text primary key," +
        "budget_period_id text not null," +
        "category_id text not null," +
        "linked_type text not null," +
        "linked_id text not null," +
        "budget_impact_amount text not null," +
        "budget_impact_currency text not null" +
      ");"
    );
    db.execSQL(
      "create table if not exists financial_containers (" +
        "id text primary key," +
        "user_id text not null," +
        "name text not null," +
        "container_type text not null," +
        "currency text not null" +
      ");"
    );
    db.execSQL(
      "create table if not exists assets (" +
        "id text primary key," +
        "symbol_or_name text not null," +
        "asset_type text not null," +
        "currency text not null" +
      ");"
    );
    db.execSQL(
      "create table if not exists investment_transactions (" +
        "id text primary key," +
        "container_id text not null," +
        "date text not null," +
        "type text not null," +
        "asset_id text," +
        "quantity text," +
        "amount text not null," +
        "currency text not null," +
        "fees_amount text," +
        "fees_currency text," +
        "taxes_amount text," +
        "taxes_currency text," +
        "note text" +
      ");"
    );
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
}
