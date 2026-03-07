package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.BudgetLink;
import com.gonezo.domain.budgeting.BudgetLinkType;
import com.gonezo.domain.budgeting.ports.BudgetLinkRepository;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

  List<BudgetLink> listByPeriod(UUID periodId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "budget_links",
      new String[] {"id", "budget_period_id", "category_id", "linked_type", "linked_id", "budget_impact_amount", "budget_impact_currency"},
      "budget_period_id = ?",
      new String[] {periodId.toString()},
      null,
      null,
      "id asc"
    );
    try {
      List<BudgetLink> links = new ArrayList<>();
      while (cursor.moveToNext()) {
        links.add(
          new BudgetLink(
            UUID.fromString(cursor.getString(0)),
            UUID.fromString(cursor.getString(1)),
            UUID.fromString(cursor.getString(2)),
            BudgetLinkType.Companion.from(cursor.getString(3)),
            UUID.fromString(cursor.getString(4)),
            new Money(new BigDecimal(cursor.getString(5)), cursor.getString(6))
          )
        );
      }
      return links;
    } finally {
      cursor.close();
    }
  }
}
