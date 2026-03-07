package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.Category;
import com.gonezo.domain.budgeting.CategoryType;
import com.gonezo.domain.budgeting.ports.CategoryRepository;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidCategoryRepository implements CategoryRepository {
  private final CoreDatabase db;

  AndroidCategoryRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public Category get(UUID id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "categories",
      new String[] {"id", "budget_plan_id", "name", "type", "allow_negative", "max_debt_amount", "max_debt_currency"},
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Category not found: " + id);
      }
      return mapCategory(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public List<Category> listByPlan(UUID planId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "categories",
      new String[] {"id", "budget_plan_id", "name", "type", "allow_negative", "max_debt_amount", "max_debt_currency"},
      "budget_plan_id = ?",
      new String[] {planId.toString()},
      null,
      null,
      "name asc"
    );
    try {
      List<Category> categories = new ArrayList<>();
      while (cursor.moveToNext()) {
        categories.add(mapCategory(cursor));
      }
      return categories;
    } finally {
      cursor.close();
    }
  }

  void save(Category category) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", category.getId().toString());
    values.put("budget_plan_id", category.getBudgetPlanId().toString());
    values.put("name", category.getName());
    values.put("type", category.getType().getValue());
    values.put("allow_negative", category.getAllowNegative() ? 1 : 0);
    values.put("max_debt_amount", category.getMaxDebtAmount() == null ? null : category.getMaxDebtAmount().getAmount().toPlainString());
    values.put("max_debt_currency", category.getMaxDebtAmount() == null ? null : category.getMaxDebtAmount().getCurrency());

    long result = database.insertWithOnConflict("categories", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save category: " + category.getId());
    }
  }

  private static Category mapCategory(Cursor cursor) {
    String maxDebtAmountValue = cursor.getString(5);
    String maxDebtCurrency = cursor.getString(6);
    Money maxDebtAmount = maxDebtAmountValue == null || maxDebtCurrency == null
      ? null
      : new Money(new BigDecimal(maxDebtAmountValue), maxDebtCurrency);

    return new Category(
      UUID.fromString(cursor.getString(0)),
      UUID.fromString(cursor.getString(1)),
      cursor.getString(2),
      CategoryType.Companion.from(cursor.getString(3)),
      cursor.getInt(4) == 1,
      maxDebtAmount
    );
  }
}
