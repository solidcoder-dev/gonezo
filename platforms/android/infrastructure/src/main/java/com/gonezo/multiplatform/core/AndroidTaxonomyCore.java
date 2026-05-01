package com.gonezo.multiplatform.core;

import android.content.Context;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.taxonomy.application.AssignCategoryToTransactionCommand;
import com.gonezo.taxonomy.application.AssignCategoryToTransactionService;
import com.gonezo.taxonomy.application.AssignCategoryToTransactionUC;
import com.gonezo.taxonomy.application.CreateCategoryCommand;
import com.gonezo.taxonomy.application.CreateCategoryService;
import com.gonezo.taxonomy.application.CreateCategoryUC;
import com.gonezo.taxonomy.application.ListCategoriesService;
import com.gonezo.taxonomy.application.ListCategoriesUC;
import com.gonezo.taxonomy.application.UnassignCategoryFromTransactionCommand;
import com.gonezo.taxonomy.application.UnassignCategoryFromTransactionService;
import com.gonezo.taxonomy.application.UnassignCategoryFromTransactionUC;
import com.gonezo.taxonomy.domain.Category;
import com.gonezo.taxonomy.domain.CategoryAppliesTo;
import com.gonezo.taxonomy.domain.CategoryId;
import com.gonezo.taxonomy.domain.CategoryStatus;
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment;
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public final class AndroidTaxonomyCore {
  private static AndroidTaxonomyCore instance;

  private final CoreDatabase database;
  private final CreateCategoryUC createCategoryUC;
  private final ListCategoriesUC listCategoriesUC;
  private final AssignCategoryToTransactionUC assignCategoryToTransactionUC;
  private final UnassignCategoryFromTransactionUC unassignCategoryFromTransactionUC;
  private final TransactionCategoryAssignmentRepository categoryAssignmentRepository;

  private AndroidTaxonomyCore(Context context) {
    CoreDatabase database = new CoreDatabase(context.getApplicationContext());
    AndroidTaxonomyCategoryRepository categoryRepository = new AndroidTaxonomyCategoryRepository(database);
    AndroidTaxonomyTransactionCategoryAssignmentRepository assignmentRepository =
      new AndroidTaxonomyTransactionCategoryAssignmentRepository(database);

    this.database = database;
    this.createCategoryUC = new CreateCategoryService(categoryRepository);
    this.listCategoriesUC = new ListCategoriesService(categoryRepository);
    this.assignCategoryToTransactionUC = new AssignCategoryToTransactionService(categoryRepository, assignmentRepository);
    this.unassignCategoryFromTransactionUC = new UnassignCategoryFromTransactionService(assignmentRepository);
    this.categoryAssignmentRepository = assignmentRepository;
  }

  public static synchronized AndroidTaxonomyCore getInstance(Context context) {
    if (instance == null) {
      instance = new AndroidTaxonomyCore(context);
    }
    return instance;
  }

  public List<TaxonomyCategoryView> listCategories(String appliesTo, Boolean includeArchived) {
    String normalizedAppliesTo = blankToNull(appliesTo) == null ? null : appliesTo.trim().toLowerCase();
    boolean resolvedIncludeArchived = includeArchived != null && includeArchived;

    return listCategoriesUC.execute().stream()
      .filter((category) -> resolvedIncludeArchived || category.getStatus() == CategoryStatus.ACTIVE)
      .filter((category) -> normalizedAppliesTo == null || category.getAppliesTo().getValue().equals(normalizedAppliesTo))
      .map(AndroidTaxonomyCore::toView)
      .toList();
  }

  public UUID createCategory(String name, String appliesTo) {
    String resolvedName = requireText(name, "Category name is required");
    String resolvedAppliesToRaw = requireText(appliesTo, "appliesTo must be expense or income").toLowerCase();
    CategoryAppliesTo resolvedAppliesTo = CategoryAppliesTo.Companion.from(resolvedAppliesToRaw);

    CategoryId id = createCategoryUC.execute(
      new CreateCategoryCommand(
        resolvedName,
        resolvedAppliesTo,
        Instant.now()
      )
    );
    return id.getValue();
  }

  public List<TaxonomyTagView> listTags(Boolean includeArchived) {
    boolean resolvedIncludeArchived = includeArchived != null && includeArchived;

    SQLiteDatabase db = database.getReadableDatabase();
    Cursor cursor = db.query(
      "taxonomy_tags",
      new String[] {"id", "name", "status"},
      resolvedIncludeArchived ? null : "status != ?",
      resolvedIncludeArchived ? null : new String[] {"archived"},
      null,
      null,
      "name_normalized asc, id asc"
    );
    try {
      List<TaxonomyTagView> tags = new ArrayList<>();
      while (cursor.moveToNext()) {
        tags.add(new TaxonomyTagView(cursor.getString(0), cursor.getString(1), cursor.getString(2)));
      }
      return tags;
    } finally {
      cursor.close();
    }
  }

  public TaxonomyCategorizationResultView categorizeTransaction(String transactionId, String transactionType, String categoryId) {
    String resolvedTransactionId = requireText(transactionId, "transactionId is required");
    String resolvedTransactionType = requireText(transactionType, "transactionType is required").toLowerCase();
    if (!"expense".equals(resolvedTransactionType) && !"income".equals(resolvedTransactionType)) {
      throw new IllegalArgumentException("Only income/expense transactions can be categorized");
    }

    UUID txId = UUID.fromString(resolvedTransactionId);
    String resolvedCategoryId = blankToNull(categoryId);
    if (resolvedCategoryId == null) {
      unassignCategoryFromTransactionUC.execute(new UnassignCategoryFromTransactionCommand(txId));
      return new TaxonomyCategorizationResultView("none", null, null, null);
    }

    try {
      assignCategoryToTransactionUC.execute(
        new AssignCategoryToTransactionCommand(
          txId,
          CategoryId.Companion.from(resolvedCategoryId),
          resolvedTransactionType,
          Instant.now()
        )
      );
      return new TaxonomyCategorizationResultView("assigned", resolvedCategoryId, null, null);
    } catch (IllegalStateException ex) {
      String message = ex.getMessage() == null ? "Categorization failed" : ex.getMessage();
      if (message.startsWith("Category not found:")) {
        return new TaxonomyCategorizationResultView("failed", resolvedCategoryId, "CATEGORY_NOT_FOUND", message);
      }
      if (message.toLowerCase().contains("archived categories cannot be assigned")) {
        return new TaxonomyCategorizationResultView("failed", resolvedCategoryId, "CATEGORY_ARCHIVED", message);
      }
      throw ex;
    } catch (IllegalArgumentException ex) {
      String message = ex.getMessage() == null ? "Categorization failed" : ex.getMessage();
      if (message.toLowerCase().contains("applies to")) {
        return new TaxonomyCategorizationResultView("failed", resolvedCategoryId, "CATEGORY_APPLIES_TO_MISMATCH", message);
      }
      throw ex;
    }
  }

  public TaxonomyTaggingResultView applyTagsToTransaction(String transactionId, List<String> tagNames) {
    String resolvedTransactionId = requireText(transactionId, "transactionId is required");
    LinkedHashMap<String, String> uniqueByNormalizedName = new LinkedHashMap<>();
    if (tagNames != null) {
      for (String rawName : tagNames) {
        if (rawName == null) {
          continue;
        }
        String name = rawName.trim();
        if (name.isEmpty()) {
          continue;
        }
        String normalizedName = normalizeTagName(name);
        uniqueByNormalizedName.putIfAbsent(normalizedName, name);
      }
    }

    SQLiteDatabase db = database.getWritableDatabase();
    if (uniqueByNormalizedName.isEmpty()) {
      db.delete(
        "taxonomy_transaction_tag_assignments",
        "transaction_id = ?",
        new String[] {resolvedTransactionId}
      );
      return new TaxonomyTaggingResultView("none", Collections.emptyList(), null, null);
    }

    List<String> tagIds = new ArrayList<>();
    db.beginTransaction();
    try {
      for (Map.Entry<String, String> entry : uniqueByNormalizedName.entrySet()) {
        String tagId = findTagIdByNormalizedName(db, entry.getKey());
        if (tagId == null) {
          tagId = UUID.randomUUID().toString();
          ContentValues tagValues = new ContentValues();
          tagValues.put("id", tagId);
          tagValues.put("name", entry.getValue());
          tagValues.put("name_normalized", entry.getKey());
          tagValues.put("status", "active");
          tagValues.put("created_at", Instant.now().toString());
          tagValues.putNull("archived_at");

          long inserted = db.insertWithOnConflict("taxonomy_tags", null, tagValues, SQLiteDatabase.CONFLICT_ABORT);
          if (inserted == -1) {
            throw new IllegalStateException("Failed to create tag: " + entry.getValue());
          }
        } else {
          String status = findTagStatusById(db, tagId);
          if (!"active".equalsIgnoreCase(status)) {
            return new TaxonomyTaggingResultView(
              "failed",
              Collections.emptyList(),
              "TAG_ARCHIVED",
              "Tag is archived: " + entry.getValue()
            );
          }
        }

        tagIds.add(tagId);
      }

      db.delete(
        "taxonomy_transaction_tag_assignments",
        "transaction_id = ?",
        new String[] {resolvedTransactionId}
      );
      String assignedAt = Instant.now().toString();
      for (String tagId : tagIds) {
        ContentValues assignmentValues = new ContentValues();
        assignmentValues.put("transaction_id", resolvedTransactionId);
        assignmentValues.put("tag_id", tagId);
        assignmentValues.put("assigned_at", assignedAt);

        long inserted = db.insertWithOnConflict(
          "taxonomy_transaction_tag_assignments",
          null,
          assignmentValues,
          SQLiteDatabase.CONFLICT_REPLACE
        );
        if (inserted == -1) {
          throw new IllegalStateException("Failed to assign tag to transaction: " + resolvedTransactionId);
        }
      }

      db.setTransactionSuccessful();
      return new TaxonomyTaggingResultView(
        "assigned",
        tagIds,
        null,
        null
      );
    } finally {
      db.endTransaction();
    }
  }

  public Map<String, TransactionTaxonomyView> listTransactionTaxonomy(Collection<String> transactionIds) {
    if (transactionIds == null || transactionIds.isEmpty()) {
      return Collections.emptyMap();
    }

    List<UUID> ids = new ArrayList<>();
    for (String transactionId : transactionIds) {
      String resolvedTransactionId = blankToNull(transactionId);
      if (resolvedTransactionId != null) {
        ids.add(UUID.fromString(resolvedTransactionId));
      }
    }
    if (ids.isEmpty()) {
      return Collections.emptyMap();
    }

    Map<UUID, TransactionCategoryAssignment> categoryAssignments =
      categoryAssignmentRepository.findByTransactionIds(ids);
    Map<String, List<String>> tagAssignments = findTagAssignmentsByTransactionIds(ids);
    Map<String, TransactionTaxonomyView> result = new HashMap<>();

    for (UUID id : ids) {
      TransactionCategoryAssignment categoryAssignment = categoryAssignments.get(id);
      List<String> tagIds = tagAssignments.getOrDefault(id.toString(), Collections.emptyList());
      String categoryId = categoryAssignment == null ? null : categoryAssignment.getCategoryId().toString();
      result.put(
        id.toString(),
        new TransactionTaxonomyView(
          id.toString(),
          categoryId,
          tagIds,
          categoryId == null ? "none" : "assigned",
          tagIds.isEmpty() ? "none" : "assigned"
        )
      );
    }

    return result;
  }

  private static TaxonomyCategoryView toView(Category category) {
    return new TaxonomyCategoryView(
      category.getId().toString(),
      category.getName(),
      category.getAppliesTo().getValue(),
      category.getStatus().getValue()
    );
  }

  private String findTagIdByNormalizedName(SQLiteDatabase db, String normalizedName) {
    Cursor cursor = db.query(
      "taxonomy_tags",
      new String[] {"id"},
      "name_normalized = ?",
      new String[] {normalizedName},
      null,
      null,
      null
    );
    try {
      return cursor.moveToFirst() ? cursor.getString(0) : null;
    } finally {
      cursor.close();
    }
  }

  private String findTagStatusById(SQLiteDatabase db, String tagId) {
    Cursor cursor = db.query(
      "taxonomy_tags",
      new String[] {"status"},
      "id = ?",
      new String[] {tagId},
      null,
      null,
      null
    );
    try {
      return cursor.moveToFirst() ? cursor.getString(0) : null;
    } finally {
      cursor.close();
    }
  }

  private Map<String, List<String>> findTagAssignmentsByTransactionIds(List<UUID> transactionIds) {
    if (transactionIds.isEmpty()) {
      return Collections.emptyMap();
    }

    SQLiteDatabase db = database.getReadableDatabase();
    StringBuilder placeholders = new StringBuilder();
    String[] args = new String[transactionIds.size()];
    for (int index = 0; index < transactionIds.size(); index += 1) {
      if (index > 0) {
        placeholders.append(",");
      }
      placeholders.append("?");
      args[index] = transactionIds.get(index).toString();
    }

    Cursor cursor = db.query(
      "taxonomy_transaction_tag_assignments",
      new String[] {"transaction_id", "tag_id"},
      "transaction_id in (" + placeholders + ")",
      args,
      null,
      null,
      "transaction_id asc, tag_id asc"
    );
    try {
      Map<String, List<String>> result = new HashMap<>();
      while (cursor.moveToNext()) {
        result.computeIfAbsent(cursor.getString(0), ignored -> new ArrayList<>()).add(cursor.getString(1));
      }
      return result;
    } finally {
      cursor.close();
    }
  }

  private static String normalizeTagName(String value) {
    return value.trim().toLowerCase(Locale.ROOT);
  }

  private static String requireText(String value, String message) {
    if (value == null || value.trim().isEmpty()) {
      throw new IllegalArgumentException(message);
    }
    return value.trim();
  }

  private static String blankToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  public record TaxonomyCategoryView(
    String id,
    String name,
    String appliesTo,
    String status
  ) {}

  public record TaxonomyCategorizationResultView(
    String status,
    String categoryId,
    String errorCode,
    String errorMessage
  ) {}

  public record TaxonomyTagView(
    String id,
    String name,
    String status
  ) {}

  public record TaxonomyTaggingResultView(
    String status,
    List<String> tagIds,
    String errorCode,
    String errorMessage
  ) {}

  public record TransactionTaxonomyView(
    String transactionId,
    String categoryId,
    List<String> tagIds,
    String categorizationStatus,
    String taggingStatus
  ) {}
}
