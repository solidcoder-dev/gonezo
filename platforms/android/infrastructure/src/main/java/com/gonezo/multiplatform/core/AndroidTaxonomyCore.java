package com.gonezo.multiplatform.core;

import android.content.Context;
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
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AndroidTaxonomyCore {
  private static AndroidTaxonomyCore instance;

  private final CreateCategoryUC createCategoryUC;
  private final ListCategoriesUC listCategoriesUC;
  private final AssignCategoryToTransactionUC assignCategoryToTransactionUC;
  private final UnassignCategoryFromTransactionUC unassignCategoryFromTransactionUC;

  private AndroidTaxonomyCore(Context context) {
    CoreDatabase database = new CoreDatabase(context.getApplicationContext());
    AndroidTaxonomyCategoryRepository categoryRepository = new AndroidTaxonomyCategoryRepository(database);
    AndroidTaxonomyTransactionCategoryAssignmentRepository assignmentRepository =
      new AndroidTaxonomyTransactionCategoryAssignmentRepository(database);

    this.createCategoryUC = new CreateCategoryService(categoryRepository);
    this.listCategoriesUC = new ListCategoriesService(categoryRepository);
    this.assignCategoryToTransactionUC = new AssignCategoryToTransactionService(categoryRepository, assignmentRepository);
    this.unassignCategoryFromTransactionUC = new UnassignCategoryFromTransactionService(assignmentRepository);
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

  private static TaxonomyCategoryView toView(Category category) {
    return new TaxonomyCategoryView(
      category.getId().toString(),
      category.getName(),
      category.getAppliesTo().getValue(),
      category.getStatus().getValue()
    );
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
}
