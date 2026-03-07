package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.CategoryBalance;
import com.gonezo.domain.budgeting.ports.CategoryBalanceRepository;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidCategoryBalanceRepository implements CategoryBalanceRepository {
  private final CoreDatabase db;

  AndroidCategoryBalanceRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void save(CategoryBalance balance) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", balance.getId().toString());
    values.put("budget_period_id", balance.getBudgetPeriodId().toString());
    values.put("category_id", balance.getCategoryId().toString());
    values.put("opening_balance_amount", balance.getOpeningBalance().getAmount().toPlainString());
    values.put("opening_balance_currency", balance.getOpeningBalance().getCurrency());
    values.put("allocated_amount", balance.getAllocated().getAmount().toPlainString());
    values.put("allocated_currency", balance.getAllocated().getCurrency());
    values.put("spent_amount", balance.getSpent().getAmount().toPlainString());
    values.put("spent_currency", balance.getSpent().getCurrency());
    values.put("available_amount", balance.getAvailable().getAmount().toPlainString());
    values.put("available_currency", balance.getAvailable().getCurrency());
    values.put("reserved_amount", balance.getReserved().getAmount().toPlainString());
    values.put("reserved_currency", balance.getReserved().getCurrency());
    values.put("safe_to_spend_amount", balance.getSafeToSpend().getAmount().toPlainString());
    values.put("safe_to_spend_currency", balance.getSafeToSpend().getCurrency());

    long result = database.insertWithOnConflict("category_balances", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save category balance: " + balance.getId());
    }
  }

  @Override
  public CategoryBalance findByPeriodAndCategory(UUID periodId, UUID categoryId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "category_balances",
      projection(),
      "budget_period_id = ? and category_id = ?",
      new String[] {periodId.toString(), categoryId.toString()},
      null,
      null,
      null,
      "1"
    );
    try {
      if (!cursor.moveToFirst()) {
        return null;
      }
      return mapBalance(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public List<CategoryBalance> listByPeriod(UUID periodId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "category_balances",
      projection(),
      "budget_period_id = ?",
      new String[] {periodId.toString()},
      null,
      null,
      "category_id asc"
    );
    try {
      List<CategoryBalance> balances = new ArrayList<>();
      while (cursor.moveToNext()) {
        balances.add(mapBalance(cursor));
      }
      return balances;
    } finally {
      cursor.close();
    }
  }

  private static String[] projection() {
    return new String[] {
      "id", "budget_period_id", "category_id",
      "opening_balance_amount", "opening_balance_currency",
      "allocated_amount", "allocated_currency",
      "spent_amount", "spent_currency",
      "available_amount", "available_currency",
      "reserved_amount", "reserved_currency",
      "safe_to_spend_amount", "safe_to_spend_currency"
    };
  }

  private static CategoryBalance mapBalance(Cursor cursor) {
    return new CategoryBalance(
      UUID.fromString(cursor.getString(0)),
      UUID.fromString(cursor.getString(1)),
      UUID.fromString(cursor.getString(2)),
      moneyFrom(cursor, 3, 4),
      moneyFrom(cursor, 5, 6),
      moneyFrom(cursor, 7, 8),
      moneyFrom(cursor, 9, 10),
      moneyFrom(cursor, 11, 12),
      moneyFrom(cursor, 13, 14)
    );
  }

  private static Money moneyFrom(Cursor cursor, int amountIdx, int currencyIdx) {
    return new Money(new BigDecimal(cursor.getString(amountIdx)), cursor.getString(currencyIdx));
  }
}
