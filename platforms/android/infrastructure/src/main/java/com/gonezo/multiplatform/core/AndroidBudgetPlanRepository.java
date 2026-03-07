package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.BudgetPlan;
import com.gonezo.domain.budgeting.BudgetPlanPeriod;
import com.gonezo.domain.budgeting.EffectiveDatingPolicy;
import com.gonezo.domain.budgeting.NegativePolicy;
import com.gonezo.domain.budgeting.ReservationPolicy;
import com.gonezo.domain.budgeting.ports.BudgetPlanRepository;
import java.util.UUID;

final class AndroidBudgetPlanRepository implements BudgetPlanRepository {
  private final CoreDatabase db;

  AndroidBudgetPlanRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public BudgetPlan get(UUID id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "budget_plans",
      new String[] {"id", "user_id", "period", "negative_policy", "reservation_policy", "effective_dating_policy"},
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );

    try {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Budget plan not found: " + id);
      }
      return new BudgetPlan(
        UUID.fromString(cursor.getString(0)),
        UUID.fromString(cursor.getString(1)),
        BudgetPlanPeriod.Companion.from(cursor.getString(2)),
        NegativePolicy.Companion.from(cursor.getString(3)),
        ReservationPolicy.Companion.from(cursor.getString(4)),
        EffectiveDatingPolicy.Companion.from(cursor.getString(5))
      );
    } finally {
      cursor.close();
    }
  }

  @Override
  public void save(BudgetPlan plan) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", plan.getId().toString());
    values.put("user_id", plan.getUserId().toString());
    values.put("period", plan.getPeriod().getValue());
    values.put("negative_policy", plan.getNegativePolicy().getValue());
    values.put("reservation_policy", plan.getReservationPolicy().getValue());
    values.put("effective_dating_policy", plan.getEffectiveDatingPolicy().getValue());

    long result = database.insertWithOnConflict("budget_plans", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save budget plan: " + plan.getId());
    }
  }
}
