package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.cashledger.Account;
import com.gonezo.domain.cashledger.AccountType;
import com.gonezo.domain.cashledger.ports.AccountRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidAccountRepository implements AccountRepository {
  private final CoreDatabase db;

  AndroidAccountRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public Account get(UUID id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "accounts",
      new String[] {"id", "user_id", "name", "type", "currency"},
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );

    try {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Account not found: " + id);
      }
      UUID userId = UUID.fromString(cursor.getString(1));
      String name = cursor.getString(2);
      String typeValue = cursor.getString(3);
      String currency = cursor.getString(4);
      AccountType type = AccountType.Companion.from(typeValue);
      return new Account(id, userId, name, type, currency);
    } finally {
      cursor.close();
    }
  }

  @Override
  public void save(Account account) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", account.getId().toString());
    values.put("user_id", account.getUserId().toString());
    values.put("name", account.getName());
    values.put("type", account.getType().getValue());
    values.put("currency", account.getCurrency());

    long result = database.insertWithOnConflict("accounts", null, values, SQLiteDatabase.CONFLICT_ABORT);
    if (result == -1) {
      throw new IllegalStateException("Failed to insert account: " + account.getId());
    }
  }

  List<Account> listAll() {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "accounts",
      new String[] {"id", "user_id", "name", "type", "currency"},
      null,
      null,
      null,
      null,
      "name asc, id asc"
    );

    try {
      List<Account> accounts = new ArrayList<>();
      while (cursor.moveToNext()) {
        UUID id = UUID.fromString(cursor.getString(0));
        UUID userId = UUID.fromString(cursor.getString(1));
        String name = cursor.getString(2);
        AccountType type = AccountType.Companion.from(cursor.getString(3));
        String currency = cursor.getString(4);
        accounts.add(new Account(id, userId, name, type, currency));
      }
      return accounts;
    } finally {
      cursor.close();
    }
  }
}
