package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.ledger.domain.Account;
import com.gonezo.ledger.domain.AccountId;
import com.gonezo.ledger.domain.AccountStatus;
import com.gonezo.ledger.domain.AccountType;
import com.gonezo.ledger.domain.CurrencyCode;
import com.gonezo.ledger.domain.ports.LedgerAccountRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidLedgerAccountRepository implements LedgerAccountRepository {
  private final CoreDatabase db;

  AndroidLedgerAccountRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void save(Account account) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", account.getId().toString());
    values.put("name", account.getName());
    values.put("type", account.getType().getValue());
    values.put("currency", account.getCurrency().toString());
    values.put("status", account.getStatus().getValue());
    values.put("created_at", account.getCreatedAt().toString());
    if (account.getArchivedAt() == null) {
      values.putNull("archived_at");
    } else {
      values.put("archived_at", account.getArchivedAt().toString());
    }

    long result = database.insertWithOnConflict("ledger_accounts", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to upsert ledger account: " + account.getId());
    }
  }

  @Override
  public Account findById(AccountId id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "ledger_accounts",
      new String[] {"id", "name", "type", "currency", "status", "created_at", "archived_at"},
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );

    try {
      if (!cursor.moveToFirst()) {
        return null;
      }
      return mapAccount(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public boolean exists(AccountId id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.rawQuery(
      "select count(*) from ledger_accounts where id = ?",
      new String[] {id.toString()}
    );
    try {
      if (!cursor.moveToFirst()) {
        return false;
      }
      return cursor.getInt(0) > 0;
    } finally {
      cursor.close();
    }
  }

  @Override
  public void deleteById(AccountId id) {
    SQLiteDatabase database = db.getWritableDatabase();
    String accountId = id.toString();

    java.util.List<String> transactionIds = new java.util.ArrayList<>();
    Cursor cursor = database.query(
      "ledger_transactions",
      new String[] {"id"},
      "account_id = ?",
      new String[] {accountId},
      null,
      null,
      null
    );

    try {
      while (cursor.moveToNext()) {
        transactionIds.add(cursor.getString(0));
      }
    } finally {
      cursor.close();
    }

    database.beginTransaction();
    try {
      if (!transactionIds.isEmpty()) {
        String placeholders = placeholders(transactionIds.size());
        String[] txArgs = transactionIds.toArray(new String[0]);
        database.delete("taxonomy_transaction_assignments", "transaction_id in (" + placeholders + ")", txArgs);
        database.delete("taxonomy_transaction_tag_assignments", "transaction_id in (" + placeholders + ")", txArgs);
        database.delete("mobills_import_fingerprints", "transaction_id in (" + placeholders + ")", txArgs);
      }

      database.delete("ledger_transactions", "account_id = ?", new String[] {accountId});
      database.delete("ledger_accounts", "id = ?", new String[] {accountId});
      database.setTransactionSuccessful();
    } finally {
      database.endTransaction();
    }
  }

  @Override
  public List<Account> listAll() {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "ledger_accounts",
      new String[] {"id", "name", "type", "currency", "status", "created_at", "archived_at"},
      null,
      null,
      null,
      null,
      "name asc, id asc"
    );
    try {
      List<Account> accounts = new ArrayList<>();
      while (cursor.moveToNext()) {
        accounts.add(mapAccount(cursor));
      }
      return accounts;
    } finally {
      cursor.close();
    }
  }

  private static Account mapAccount(Cursor cursor) {
    AccountId id = new AccountId(UUID.fromString(cursor.getString(0)));
    String name = cursor.getString(1);
    AccountType type = AccountType.Companion.from(cursor.getString(2));
    CurrencyCode currency = CurrencyCode.Companion.from(cursor.getString(3));
    AccountStatus status = AccountStatus.Companion.from(cursor.getString(4));
    Instant createdAt = Instant.parse(cursor.getString(5));
    String archivedAtRaw = cursor.getString(6);
    Instant archivedAt = archivedAtRaw == null ? null : Instant.parse(archivedAtRaw);
    return new Account(id, name, type, currency, status, createdAt, archivedAt);
  }

  private static String placeholders(int count) {
    StringBuilder builder = new StringBuilder();
    for (int index = 0; index < count; index++) {
      if (index > 0) {
        builder.append(",");
      }
      builder.append("?");
    }
    return builder.toString();
  }
}
