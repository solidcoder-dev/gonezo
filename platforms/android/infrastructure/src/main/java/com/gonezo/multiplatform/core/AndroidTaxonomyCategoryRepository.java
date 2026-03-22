package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.taxonomy.domain.Category;
import com.gonezo.taxonomy.domain.CategoryAppliesTo;
import com.gonezo.taxonomy.domain.CategoryId;
import com.gonezo.taxonomy.domain.CategoryStatus;
import com.gonezo.taxonomy.domain.ports.CategoryRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

final class AndroidTaxonomyCategoryRepository implements CategoryRepository {
  private final CoreDatabase db;

  AndroidTaxonomyCategoryRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void save(Category category) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", category.getId().toString());
    values.put("name", category.getName());
    values.put("name_normalized", category.getName().trim().toLowerCase());
    values.put("applies_to", category.getAppliesTo().getValue());
    values.put("status", category.getStatus().getValue());
    values.put("created_at", category.getCreatedAt().toString());
    if (category.getArchivedAt() == null) {
      values.putNull("archived_at");
    } else {
      values.put("archived_at", category.getArchivedAt().toString());
    }

    long result = database.insertWithOnConflict("taxonomy_categories", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to upsert taxonomy category: " + category.getId());
    }
  }

  @Override
  public Category findById(CategoryId id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "taxonomy_categories",
      new String[] {"id", "name", "applies_to", "status", "created_at", "archived_at"},
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
      return mapCategory(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public Map<CategoryId, Category> findByIds(Collection<CategoryId> ids) {
    if (ids.isEmpty()) {
      return Collections.emptyMap();
    }

    SQLiteDatabase database = db.getReadableDatabase();
    StringBuilder placeholders = new StringBuilder();
    String[] args = new String[ids.size()];
    int index = 0;
    for (CategoryId id : ids) {
      if (index > 0) {
        placeholders.append(",");
      }
      placeholders.append("?");
      args[index] = id.toString();
      index += 1;
    }

    Cursor cursor = database.query(
      "taxonomy_categories",
      new String[] {"id", "name", "applies_to", "status", "created_at", "archived_at"},
      "id in (" + placeholders + ")",
      args,
      null,
      null,
      null
    );

    try {
      Map<CategoryId, Category> result = new HashMap<>();
      while (cursor.moveToNext()) {
        Category category = mapCategory(cursor);
        result.put(category.getId(), category);
      }
      return result;
    } finally {
      cursor.close();
    }
  }

  @Override
  public Category findByNormalizedNameAndAppliesTo(String name, CategoryAppliesTo appliesTo) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "taxonomy_categories",
      new String[] {"id", "name", "applies_to", "status", "created_at", "archived_at"},
      "name_normalized = ? and applies_to = ?",
      new String[] {name.trim().toLowerCase(), appliesTo.getValue()},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        return null;
      }
      return mapCategory(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public List<Category> listAll() {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "taxonomy_categories",
      new String[] {"id", "name", "applies_to", "status", "created_at", "archived_at"},
      null,
      null,
      null,
      null,
      "applies_to asc, name_normalized asc, id asc"
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

  private static Category mapCategory(Cursor cursor) {
    CategoryId id = CategoryId.Companion.from(cursor.getString(0));
    String name = cursor.getString(1);
    CategoryAppliesTo appliesTo = CategoryAppliesTo.Companion.from(cursor.getString(2));
    CategoryStatus status = CategoryStatus.Companion.from(cursor.getString(3));
    Instant createdAt = Instant.parse(cursor.getString(4));
    String archivedAtRaw = cursor.getString(5);
    Instant archivedAt = archivedAtRaw == null ? null : Instant.parse(archivedAtRaw);

    return new Category(
      id,
      name,
      appliesTo,
      status,
      createdAt,
      archivedAt
    );
  }
}
