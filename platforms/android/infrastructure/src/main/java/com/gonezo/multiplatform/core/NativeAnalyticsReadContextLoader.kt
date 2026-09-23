package com.gonezo.multiplatform.core

import com.gonezo.application.query.AnalyticsCategoryAmount
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.sharing.domain.MovementShare
import com.gonezo.sharing.domain.PlannedMovementShare
import com.gonezo.sharing.domain.RecurringSharePlan
import com.gonezo.taxonomy.domain.TagName
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

internal data class NativeAnalyticsReadContext(
  val includePlannedMovements: Boolean,
  val accounts: List<AndroidLedgerCore.LedgerAccountView>,
  val recurringMovements: List<RecurringMovement>,
  val recurringMovementsById: Map<RecurringMovementId, RecurringMovement>,
  val tagDisplayNamesById: Map<String, String>,
  val tagIdsByNormalizedName: Map<String, String>,
)

internal data class PostedAnalyticsDependencies(
  val occurrencesByTransactionId: Map<String, RecurringMovementOccurrence>,
  val sharesByTransaction: Map<String, MovementShare>,
)

internal data class ExpectedAnalyticsDependencies(
  val occurrencesById: Map<UUID, RecurringMovementOccurrence>,
  val plannedSharesByExpected: Map<String, PlannedMovementShare>,
)

internal data class ScheduledAnalyticsDependencies(
  val occurrencesBySeriesAndDueAt: Map<Pair<RecurringMovementId, Instant>, RecurringMovementOccurrence>,
  val sharingPlansByRecurring: Map<String, RecurringSharePlan>,
)

internal class NativeAnalyticsReadContextLoader(context: android.content.Context) {
  private val database = CoreDatabase(context.applicationContext)
  private val ledger = AndroidLedgerCore.getInstance(context)
  private val recurring = AndroidRecurringMovementRepository(database)
  private val occurrences = AndroidRecurringMovementOccurrenceRepository(database)
  private val movementShares = AndroidMovementShareRepository(database)
  private val plannedShares = AndroidPlannedMovementShareRepository(database)
  private val recurringSharePlans = AndroidRecurringSharePlanRepository(database)

  fun load(accountIds: Set<String>, includePlannedMovements: Boolean): NativeAnalyticsReadContext {
    val accounts = ledger.listAccounts().let { allAccounts -> if (accountIds.isEmpty()) allAccounts else allAccounts.filter { it.id in accountIds } }
    val recurringMovements = accounts.flatMap { account -> recurring.listBySourceAccount(account.id) }
      .distinctBy { it.id }
    val taxonomyTags = AndroidTaxonomyTagRepository(database).listAll()
    return NativeAnalyticsReadContext(
      includePlannedMovements = includePlannedMovements,
      accounts = accounts,
      recurringMovements = recurringMovements,
      recurringMovementsById = recurringMovements.associateBy { it.id },
      tagDisplayNamesById = taxonomyTags.associate { it.id.toString() to it.name },
      tagIdsByNormalizedName = taxonomyTags.associate { TagName.normalizeTagName(it.name) to it.id.toString() },
    )
  }

  fun postedDependencies(transactionIds: Collection<String>) = PostedAnalyticsDependencies(
    occurrencesByTransactionId = occurrences.findByLedgerTransactionIds(transactionIds).associateBy { requireNotNull(it.ledgerTransactionId) },
    sharesByTransaction = movementShares.findBySourceTransactionIds(transactionIds).associateBy { requireNotNull(it.sourceTransactionId) },
  )

  fun expectedDependencies(expectedMovementIds: Collection<String>, originOccurrenceIds: Collection<String>, includePlannedMovements: Boolean) = ExpectedAnalyticsDependencies(
    occurrencesById = occurrences.findByIds(originOccurrenceIds.mapNotNull { runCatching { UUID.fromString(it) }.getOrNull() }).associateBy { it.id },
    plannedSharesByExpected = if (includePlannedMovements) plannedShares.findByExpectedMovementIds(expectedMovementIds).associateBy { requireNotNull(it.expectedMovementRef.value) } else emptyMap(),
  )

  fun scheduledDependencies(recurringMovementIds: Collection<RecurringMovementId>, fromInclusive: Instant, toExclusive: Instant, includePlannedMovements: Boolean) = ScheduledAnalyticsDependencies(
    occurrencesBySeriesAndDueAt = occurrences.findByRecurringMovementIdsAndWindow(recurringMovementIds, fromInclusive, toExclusive).associateBy { it.recurringMovementId to it.dueAt },
    sharingPlansByRecurring = if (includePlannedMovements) recurringSharePlans.findByRecurringMovementRefs(recurringMovementIds.map(RecurringMovementId::toString)).associateBy { requireNotNull(it.recurringMovementRef.value) } else emptyMap(),
  )

  fun tagIdsByTransaction(transactionIds: Collection<String>): Map<String, Set<String>> = transactionIds.queryInChunks { ids ->
    val placeholders = ids.joinToString(",") { "?" }
    database.readableDatabase.query("taxonomy_transaction_tag_assignments", arrayOf("transaction_id", "tag_id"), "transaction_id in ($placeholders)", ids.toTypedArray(), null, null, "transaction_id asc, tag_id asc").use { cursor -> buildList { while (cursor.moveToNext()) add(cursor.getString(0) to cursor.getString(1)) } }
  }.groupBy({ it.first }, { it.second }).mapValues { (_, ids) -> ids.toSet() }

  fun categoryIdsByTransaction(transactionIds: Collection<String>): Map<String, String> = transactionIds.queryInChunks { ids ->
    val placeholders = ids.joinToString(",") { "?" }
    database.readableDatabase.query("taxonomy_transaction_assignments", arrayOf("transaction_id", "category_id"), "transaction_id in ($placeholders)", ids.toTypedArray(), null, null, "transaction_id asc").use { cursor -> buildList { while (cursor.moveToNext()) add(cursor.getString(0) to cursor.getString(1)) } }
  }.toMap()

  fun splitAmountsByTransaction(transactionIds: Collection<String>): Map<String, List<AnalyticsCategoryAmount>> = transactionIds.queryInChunks { ids ->
    val placeholders = ids.joinToString(",") { "?" }
    database.readableDatabase.rawQuery("select items.transaction_id, assignments.category_id, items.amount from ledger_transaction_items items left join taxonomy_transaction_item_category_assignments assignments on assignments.transaction_item_id = items.id where items.transaction_id in ($placeholders) order by items.transaction_id asc, items.id asc", ids.toTypedArray()).use { cursor -> buildList { while (cursor.moveToNext()) add(cursor.getString(0) to AnalyticsCategoryAmount(cursor.getString(1), BigDecimal(cursor.getString(2)))) } }
  }.groupBy({ it.first }, { it.second }).mapValues { (_, amounts) -> amounts }

  private fun <T> Collection<String>.queryInChunks(query: (List<String>) -> List<T>): List<T> = distinct().chunked(SQLITE_BATCH_SIZE).flatMap(query)

  private companion object { const val SQLITE_BATCH_SIZE = 900 }
}
