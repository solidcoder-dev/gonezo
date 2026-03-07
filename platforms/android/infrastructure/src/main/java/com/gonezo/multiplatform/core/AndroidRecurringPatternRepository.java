package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.ProrationType;
import com.gonezo.domain.budgeting.RecurringCadence;
import com.gonezo.domain.budgeting.RecurringPattern;
import com.gonezo.domain.budgeting.ports.RecurringPatternRepository;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidRecurringPatternRepository implements RecurringPatternRepository {
  private final CoreDatabase db;

  AndroidRecurringPatternRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public List<RecurringPattern> listActiveByPlan(UUID planId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "recurring_patterns",
      projection(),
      "budget_plan_id = ? and active = 1",
      new String[] {planId.toString()},
      null,
      null,
      "id asc"
    );
    try {
      List<RecurringPattern> patterns = new ArrayList<>();
      while (cursor.moveToNext()) {
        patterns.add(mapPattern(cursor));
      }
      return patterns;
    } finally {
      cursor.close();
    }
  }

  @Override
  public void save(RecurringPattern pattern) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", pattern.getId().toString());
    values.put("budget_plan_id", pattern.getBudgetPlanId().toString());
    values.put("category_id", pattern.getCategoryId().toString());
    values.put("name", pattern.getName());
    values.put("cadence", pattern.getCadence().getValue());
    values.put("expected_amount", pattern.getExpectedAmount().getAmount().toPlainString());
    values.put("expected_currency", pattern.getExpectedAmount().getCurrency());
    values.put("tolerance_amount", pattern.getTolerance().getAmount().toPlainString());
    values.put("tolerance_currency", pattern.getTolerance().getCurrency());
    values.put("merchant_matcher", pattern.getMerchantMatcher());
    values.put("billing_day", pattern.getBillingDay());
    values.put("billing_month", pattern.getBillingMonth());
    values.put("proration", pattern.getProration() == null ? null : pattern.getProration().getValue());
    values.put("active", pattern.getActive() ? 1 : 0);

    long result = database.insertWithOnConflict("recurring_patterns", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save recurring pattern: " + pattern.getId());
    }
  }

  private static String[] projection() {
    return new String[] {
      "id", "budget_plan_id", "category_id", "name", "cadence",
      "expected_amount", "expected_currency",
      "tolerance_amount", "tolerance_currency",
      "merchant_matcher", "billing_day", "billing_month", "proration", "active"
    };
  }

  private static RecurringPattern mapPattern(Cursor cursor) {
    String prorationValue = cursor.getString(12);
    return new RecurringPattern(
      UUID.fromString(cursor.getString(0)),
      UUID.fromString(cursor.getString(1)),
      UUID.fromString(cursor.getString(2)),
      cursor.getString(3),
      RecurringCadence.Companion.from(cursor.getString(4)),
      new Money(new BigDecimal(cursor.getString(5)), cursor.getString(6)),
      new Money(new BigDecimal(cursor.getString(7)), cursor.getString(8)),
      cursor.getString(9),
      cursor.isNull(10) ? null : cursor.getInt(10),
      cursor.isNull(11) ? null : cursor.getInt(11),
      ProrationType.Companion.from(prorationValue),
      cursor.getInt(13) == 1
    );
  }
}
