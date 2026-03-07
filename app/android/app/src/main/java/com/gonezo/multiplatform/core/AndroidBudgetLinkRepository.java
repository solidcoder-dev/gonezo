package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.BudgetLink;
import com.gonezo.domain.budgeting.ports.BudgetLinkRepository;

final class AndroidBudgetLinkRepository implements BudgetLinkRepository {
  private final CoreDatabase db;

  AndroidBudgetLinkRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void save(BudgetLink link) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", link.getId().toString());
    values.put("budget_period_id", link.getBudgetPeriodId().toString());
    values.put("category_id", link.getCategoryId().toString());
    values.put("linked_type", link.getLinkedType().getValue());
    values.put("linked_id", link.getLinkedId().toString());
    values.put("budget_impact_amount", link.getBudgetImpactAmount().getAmount().toPlainString());
    values.put("budget_impact_currency", link.getBudgetImpactAmount().getCurrency());

    long result = database.insertWithOnConflict("budget_links", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save budget link: " + link.getId());
    }
  }
}
