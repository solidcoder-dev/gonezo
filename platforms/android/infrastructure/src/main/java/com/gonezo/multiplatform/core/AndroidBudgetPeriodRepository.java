package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.BudgetPeriod;
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository;
import com.gonezo.domain.shared.Money;
import com.gonezo.domain.shared.YearMonth;
import java.math.BigDecimal;
import java.util.UUID;

final class AndroidBudgetPeriodRepository implements BudgetPeriodRepository {
  private final CoreDatabase db;

  AndroidBudgetPeriodRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public BudgetPeriod get(UUID id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "budget_periods",
      new String[] {"id", "budget_plan_id", "year", "month", "income_total_amount", "income_total_currency", "remainder_amount", "remainder_currency"},
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Budget period not found: " + id);
      }
      return mapPeriod(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public BudgetPeriod getByYearMonth(UUID planId, YearMonth yearMonth) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "budget_periods",
      new String[] {"id", "budget_plan_id", "year", "month", "income_total_amount", "income_total_currency", "remainder_amount", "remainder_currency"},
      "budget_plan_id = ? and year = ? and month = ?",
      new String[] {planId.toString(), String.valueOf(yearMonth.getYear()), String.valueOf(yearMonth.getMonth())},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Budget period not found for plan/year/month: " + planId + "/" + yearMonth.getYear() + "/" + yearMonth.getMonth());
      }
      return mapPeriod(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public void save(BudgetPeriod period) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", period.getId().toString());
    values.put("budget_plan_id", period.getBudgetPlanId().toString());
    values.put("year", period.getYearMonth().getYear());
    values.put("month", period.getYearMonth().getMonth());
    values.put("income_total_amount", period.getIncomeTotal().getAmount().toPlainString());
    values.put("income_total_currency", period.getIncomeTotal().getCurrency());
    values.put("remainder_amount", period.getRemainder().getAmount().toPlainString());
    values.put("remainder_currency", period.getRemainder().getCurrency());

    long result = database.insertWithOnConflict("budget_periods", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save budget period: " + period.getId());
    }
  }

  @Override
  public void updateTotals(UUID id, Money incomeTotal, Money remainder) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("income_total_amount", incomeTotal.getAmount().toPlainString());
    values.put("income_total_currency", incomeTotal.getCurrency());
    values.put("remainder_amount", remainder.getAmount().toPlainString());
    values.put("remainder_currency", remainder.getCurrency());

    int updated = database.update("budget_periods", values, "id = ?", new String[] {id.toString()});
    if (updated != 1) {
      throw new IllegalStateException("Failed to update totals for budget period: " + id);
    }
  }

  private static BudgetPeriod mapPeriod(Cursor cursor) {
    UUID id = UUID.fromString(cursor.getString(0));
    UUID planId = UUID.fromString(cursor.getString(1));
    int year = cursor.getInt(2);
    int month = cursor.getInt(3);
    BigDecimal incomeTotalAmount = new BigDecimal(cursor.getString(4));
    String incomeTotalCurrency = cursor.getString(5);
    BigDecimal remainderAmount = new BigDecimal(cursor.getString(6));
    String remainderCurrency = cursor.getString(7);

    return new BudgetPeriod(
      id,
      planId,
      new YearMonth(year, month),
      new Money(incomeTotalAmount, incomeTotalCurrency),
      new Money(remainderAmount, remainderCurrency)
    );
  }
}
