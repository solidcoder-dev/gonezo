package com.gonezo.multiplatform.core

import com.gonezo.application.query.AnalyticsCategoryAmount
import com.gonezo.application.query.AnalyticsTagReference
import com.gonezo.application.query.AnalyticsTagReferenceResolver
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.sharing.domain.MovementShare
import com.gonezo.sharing.domain.PlannedMovementShare
import com.gonezo.sharing.domain.RecurringSharePlan
import com.gonezo.sharing.domain.ports.MovementShareRepository
import com.gonezo.sharing.domain.ports.PlannedMovementShareRepository
import com.gonezo.sharing.domain.ports.RecurringSharePlanRepository
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagName
import java.math.BigDecimal
import java.time.Instant

internal data class NativeAnalyticsReadContext(
  val accounts: List<AndroidLedgerCore.LedgerAccountView>,
  val recurringMovements: List<RecurringMovement>,
  val recurringMovementsById: Map<RecurringMovementId, RecurringMovement>,
  val occurrencesById: Map<java.util.UUID, RecurringMovementOccurrence>,
  val occurrencesByTransactionId: Map<String, RecurringMovementOccurrence>,
  val occurrencesBySeriesAndDueAt: Map<Pair<RecurringMovementId, Instant>, RecurringMovementOccurrence>,
  val taxonomyTags: List<Tag>,
  val tagDisplayNamesById: Map<String, String>,
  val tagIdsByNormalizedName: Map<String, String>,
  val sharesByTransaction: Map<String, MovementShare>,
  val plannedSharesByExpected: Map<String, PlannedMovementShare>,
  val sharingPlansByRecurring: Map<String, RecurringSharePlan>,
)

internal class NativeAnalyticsReadContextLoader(
  context: android.content.Context,
) {
  private val database = CoreDatabase(context.applicationContext)
  private val ledger = AndroidLedgerCore.getInstance(context)
  private val recurring = AndroidRecurringMovementRepository(database)
  private val occurrences = AndroidRecurringMovementOccurrenceRepository(database)
  private val movementShares: MovementShareRepository = AndroidMovementShareRepository(database)
  private val plannedShares: PlannedMovementShareRepository = AndroidPlannedMovementShareRepository(database)
  private val recurringSharePlans: RecurringSharePlanRepository = AndroidRecurringSharePlanRepository(database)

  fun load(): NativeAnalyticsReadContext {
    val accounts = ledger.listAccounts()
    val recurringMovements = recurring.listAll()
    val occurrenceItems = occurrences.listAll()
    val taxonomyTags = AndroidTaxonomyTagRepository(database).listAll()
    return NativeAnalyticsReadContext(
      accounts = accounts,
      recurringMovements = recurringMovements,
      recurringMovementsById = recurringMovements.associateBy { it.id },
      occurrencesById = occurrenceItems.associateBy { it.id },
      occurrencesByTransactionId = occurrenceItems.mapNotNull { occurrence -> occurrence.ledgerTransactionId?.let { it to occurrence } }.toMap(),
      occurrencesBySeriesAndDueAt = occurrenceItems.associateBy { it.recurringMovementId to it.dueAt },
      taxonomyTags = taxonomyTags,
      tagDisplayNamesById = taxonomyTags.associate { it.id.toString() to it.name },
      tagIdsByNormalizedName = taxonomyTags.associate { TagName.normalizeTagName(it.name) to it.id.toString() },
      sharesByTransaction = movementShares.listAll().associateBy { it.sourceTransactionId },
      plannedSharesByExpected = plannedShares.listAll().associateBy { it.expectedMovementRef.value },
      sharingPlansByRecurring = recurringSharePlans.listAll().associateBy { it.recurringMovementRef.value },
    )
  }

  fun tagIdsByTransaction(transactionIds: Collection<String>): Map<String, Set<String>> {
    if (transactionIds.isEmpty()) return emptyMap()
    val placeholders = transactionIds.joinToString(",") { "?" }
    val assignments = database.readableDatabase.query(
      "taxonomy_transaction_tag_assignments", arrayOf("transaction_id", "tag_id"), "transaction_id in ($placeholders)", transactionIds.toTypedArray(), null, null, "transaction_id asc, tag_id asc",
    ).use { cursor ->
      buildMap<String, MutableSet<String>> {
        while (cursor.moveToNext()) {
          val transactionId = cursor.getString(0)
          getOrPut(transactionId) { linkedSetOf() }.add(cursor.getString(1))
        }
      }
    }
    return assignments.mapValues { (_, tagIds) -> tagIds.toSet() }
  }

  fun categoryIdsByTransaction(transactionIds: Collection<String>): Map<String, String> {
    if (transactionIds.isEmpty()) return emptyMap()
    val placeholders = transactionIds.joinToString(",") { "?" }
    return database.readableDatabase.query(
      "taxonomy_transaction_assignments", arrayOf("transaction_id", "category_id"), "transaction_id in ($placeholders)", transactionIds.toTypedArray(), null, null, "transaction_id asc",
    ).use { cursor ->
      buildMap { while (cursor.moveToNext()) put(cursor.getString(0), cursor.getString(1)) }
    }
  }

  fun splitAmountsByTransaction(transactionIds: Collection<String>): Map<String, List<AnalyticsCategoryAmount>> {
    if (transactionIds.isEmpty()) return emptyMap()
    val placeholders = transactionIds.joinToString(",") { "?" }
    val assignments = database.readableDatabase.rawQuery(
      "select items.transaction_id, assignments.category_id, items.amount from ledger_transaction_items items " +
        "left join taxonomy_transaction_item_category_assignments assignments on assignments.transaction_item_id = items.id " +
        "where items.transaction_id in ($placeholders) order by items.transaction_id asc, items.id asc",
      transactionIds.toTypedArray(),
    ).use { cursor ->
      buildMap<String, MutableList<AnalyticsCategoryAmount>> {
        while (cursor.moveToNext()) {
          val transactionId = cursor.getString(0)
          val allocation = AnalyticsCategoryAmount(cursor.getString(1), BigDecimal(cursor.getString(2)))
          getOrPut(transactionId) { mutableListOf() }.add(allocation)
        }
      }
    }
    return assignments.mapValues { (_, amounts) -> amounts.toList() }
  }
}
