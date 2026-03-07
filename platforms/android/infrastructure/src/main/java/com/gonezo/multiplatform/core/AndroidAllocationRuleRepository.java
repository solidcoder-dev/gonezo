package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.AllocationRule;
import com.gonezo.domain.budgeting.ports.AllocationRuleRepository;
import com.gonezo.domain.shared.Percent;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidAllocationRuleRepository implements AllocationRuleRepository {
  private final CoreDatabase db;

  AndroidAllocationRuleRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public List<AllocationRule> listByPlan(UUID planId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "allocation_rules",
      new String[] {"id", "budget_plan_id", "category_id", "percent_of_remainder"},
      "budget_plan_id = ?",
      new String[] {planId.toString()},
      null,
      null,
      "id asc"
    );
    try {
      List<AllocationRule> rules = new ArrayList<>();
      while (cursor.moveToNext()) {
        rules.add(
          new AllocationRule(
            UUID.fromString(cursor.getString(0)),
            UUID.fromString(cursor.getString(1)),
            UUID.fromString(cursor.getString(2)),
            new Percent(new BigDecimal(cursor.getString(3)))
          )
        );
      }
      return rules;
    } finally {
      cursor.close();
    }
  }

  void save(AllocationRule rule) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", rule.getId().toString());
    values.put("budget_plan_id", rule.getBudgetPlanId().toString());
    values.put("category_id", rule.getCategoryId().toString());
    values.put("percent_of_remainder", rule.getPercentOfRemainder().getValue().toPlainString());

    long result = database.insertWithOnConflict("allocation_rules", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save allocation rule: " + rule.getId());
    }
  }
}
