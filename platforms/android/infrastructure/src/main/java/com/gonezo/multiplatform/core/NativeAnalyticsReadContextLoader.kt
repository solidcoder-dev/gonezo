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
  val occurrencesById: Map<UUID, RecurringMovementOccurrence>,
  val occurrencesByTransactionId: Map<String, RecurringMovementOccurrence>,
  val occurrencesBySeriesAndDueAt: Map<Pair<RecurringMovementId, Instant>, RecurringMovementOccurrence>,
  val tagDisplayNamesById: Map<String, String>,
  val tagIdsByNormalizedName: Map<String, String>,
  val sharesByTransaction: Map<String, MovementShare>,
  val plannedSharesByExpected: Map<String, PlannedMovementShare>,
  val sharingPlansByRecurring: Map<String, RecurringSharePlan>,
)

internal data class NativeAnalyticsReadDependencies(
  val occurrences: List<RecurringMovementOccurrence> = emptyList(),
  val movementShares: List<MovementShare> = emptyList(),
  val plannedMovementShares: List<PlannedMovementShare> = emptyList(),
  val recurringSharePlans: List<RecurringSharePlan> = emptyList(),
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
    val scopedAccountIds = accounts.mapTo(hashSetOf()) { it.id }
    val recurringMovements = accounts.flatMap { account -> recurring.listBySourceAccount(account.id) }
      .distinctBy { it.id }
    val taxonomyTags = AndroidTaxonomyTagRepository(database).listAll()
    return NativeAnalyticsReadContext(includePlannedMovements, accounts, recurringMovements, recurringMovements.associateBy { it.id }, emptyMap(), emptyMap(), emptyMap(), taxonomyTags.associate { it.id.toString() to it.name }, taxonomyTags.associate { TagName.normalizeTagName(it.name) to it.id.toString() }, emptyMap(), emptyMap(), emptyMap())
  }

  fun postedDependencies(transactionIds: Collection<String>) = NativeAnalyticsReadDependencies(
    occurrences = occurrences.findByLedgerTransactionIds(transactionIds),
    movementShares = movementShares.findBySourceTransactionIds(transactionIds),
  )

  fun expectedDependencies(expectedMovementIds: Collection<String>, originOccurrenceIds: Collection<String>, includePlannedMovements: Boolean) = NativeAnalyticsReadDependencies(
    occurrences = occurrences.findByIds(originOccurrenceIds.mapNotNull { runCatching { UUID.fromString(it) }.getOrNull() }),
    plannedMovementShares = if (includePlannedMovements) plannedShares.findByExpectedMovementIds(expectedMovementIds) else emptyList(),
  )

  fun scheduledDependencies(recurringMovementIds: Collection<RecurringMovementId>, fromInclusive: Instant, toExclusive: Instant, includePlannedMovements: Boolean) = NativeAnalyticsReadDependencies(
    occurrences = occurrences.findByRecurringMovementIdsAndWindow(recurringMovementIds, fromInclusive, toExclusive),
    recurringSharePlans = if (includePlannedMovements) recurringSharePlans.findByRecurringMovementRefs(recurringMovementIds.map(RecurringMovementId::toString)) else emptyList(),
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
