package com.gonezo.multiplatform.core

import com.gonezo.application.query.AnalyticsExpectedMovement
import com.gonezo.application.query.AnalyticsMovementFactQuery
import com.gonezo.application.query.AnalyticsMovementIdentity
import com.gonezo.application.query.AnalyticsMovementReadResult
import com.gonezo.application.query.AnalyticsMovementReadWindow
import com.gonezo.application.query.AnalyticsMovementType
import com.gonezo.application.query.AnalyticsPostedMovement
import com.gonezo.application.query.AnalyticsScheduledMovementReader
import com.gonezo.application.query.AnalyticsScheduledProjection
import com.gonezo.application.query.AnalyticsExpectedMovementReader
import com.gonezo.application.query.AnalyticsPostedMovementReader
import com.gonezo.domain.shared.Money
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.application.query.AnalyticsScheduledOccurrenceProjector
import com.gonezo.application.query.AnalyticsMovementQueryFilters
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class AndroidAnalyticsQueryCore(private val context: android.content.Context) {
  private val database = CoreDatabase(context.applicationContext)
  private val ledger = AndroidLedgerCore.getInstance(context)
  private val expected = AndroidExpectedCore.getInstance(context)
  private val recurring = AndroidRecurringMovementRepository(database)
  private val occurrences = AndroidRecurringMovementOccurrenceRepository(database)
  private val projector = AnalyticsScheduledOccurrenceProjector()

  fun query(fromInclusive: Instant, toExclusive: Instant, includePlannedMovements: Boolean, currency: String?): AnalyticsMovementReadResult {
    val window = AnalyticsMovementReadWindow(fromInclusive, toExclusive)
    val result = AnalyticsMovementFactQuery(
      postedReader = object : AnalyticsPostedMovementReader {
        override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsPostedMovement> = posted(window)
      },
      expectedReader = object : AnalyticsExpectedMovementReader {
        override fun readPending(window: AnalyticsMovementReadWindow): Iterable<AnalyticsExpectedMovement> = pendingExpected(window)
      },
      scheduledReader = object : AnalyticsScheduledMovementReader {
        override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsScheduledProjection> = scheduled(window)
      },
    ).execute(
      window = window,
      filters = AnalyticsMovementQueryFilters(currency = currency?.let { com.gonezo.domain.shared.CurrencyCode.from(it) }),
      includePlannedMovements = includePlannedMovements,
    )
    return result
  }

  fun query(fromLocalDate: String, toLocalDate: String, zoneId: String, includePlannedMovements: Boolean, currency: String?): AnalyticsMovementReadResult {
    val zone = ZoneId.of(zoneId)
    val fromInclusive = LocalDate.parse(fromLocalDate).atStartOfDay(zone).toInstant()
    val toExclusive = LocalDate.parse(toLocalDate).plusDays(1).atStartOfDay(zone).toInstant()
    return query(fromInclusive, toExclusive, includePlannedMovements, currency)
  }

  private fun posted(window: AnalyticsMovementReadWindow): List<AnalyticsPostedMovement> = ledger.listAccounts().flatMap { account ->
      ledger.listTransactionsHalfOpen(
      account.id, 100, window.fromInclusive.toString(), window.toExclusive.toString(), null, null, true,
    ).filter { it.status.equals("posted", true) }.mapNotNull { transaction ->
      val type = transaction.type.toAnalyticsType() ?: return@mapNotNull null
      val amount = Money(BigDecimal(transaction.amount), transaction.currency)
      AnalyticsPostedMovement(
        id = transaction.id, effectiveAt = Instant.parse(transaction.occurredAt), accountId = transaction.accountId,
        type = type, currency = com.gonezo.domain.shared.CurrencyCode.from(transaction.currency),
        personalAmount = amount, fullAmount = amount, ignored = isIgnored("movement", transaction.id),
        categoryId = transaction.categoryId ?: categoryId(transaction.id), tagIds = tagIds(transaction.id),
      )
    }
  }

  private fun pendingExpected(window: AnalyticsMovementReadWindow): List<AnalyticsExpectedMovement> = ledger.listAccounts().flatMap { account ->
    expected.listMovements(account.id, false).filter { it.status.equals("pending", true) }
      .mapNotNull { movement ->
        val at = Instant.parse(movement.expectedAt)
        if (!window.contains(at)) return@mapNotNull null
        val type = movement.type.toAnalyticsType() ?: return@mapNotNull null
        val amount = Money(BigDecimal(movement.amount), movement.currency)
        AnalyticsExpectedMovement(
          id = movement.id, effectiveAt = at, accountId = movement.accountId, type = type,
          currency = com.gonezo.domain.shared.CurrencyCode.from(movement.currency), personalAmount = amount, fullAmount = amount,
          pending = true, ignored = isIgnored("expected_movement", movement.id), categoryId = movement.categoryId,
          tagIds = expectedTagIds(movement.id),
          originOccurrenceId = movement.originOccurrenceId, originRecurringMovementId = movement.originRecurringMovementId,
          resolvedTransactionId = movement.resolvedTransactionId,
        )
      }
  }

  private fun scheduled(window: AnalyticsMovementReadWindow): List<AnalyticsScheduledProjection> {
    val movements = ledger.listAccounts().flatMap { recurring.listBySourceAccount(it.id) }.distinctBy { it.id }
    return movements.flatMap { movement ->
      projector.project(movement, window.fromInclusive, window.toExclusive) { dueAt, _ ->
        occurrences.findByRecurringMovementAndDueAt(movement.id, dueAt)?.id?.toString()
      }.map { occurrence ->
        val type = movement.type.value.toAnalyticsType() ?: return@map null
        val amount = Money(movement.amount, movement.currency)
        AnalyticsScheduledProjection(
          identity = occurrence.identity, effectiveAt = occurrence.effectiveAt, accountId = movement.sourceAccountId,
          type = type, currency = com.gonezo.domain.shared.CurrencyCode.from(movement.currency),
          personalAmount = amount, fullAmount = amount, categoryId = movement.categoryId,
          originOccurrenceId = occurrence.originOccurrenceId,
          recurringMovementId = movement.id.toString(),
        )
      }.filterNotNull()
    }
  }

  private fun isIgnored(scopeType: String, scopeId: String): Boolean = database.readableDatabase.query(
    "analytics_exclusions", arrayOf("id"), "scope_type = ? and scope_id = ? and reason = ?",
    arrayOf(scopeType, scopeId, "user_ignored"), null, null, null, "1",
  ).use { it.moveToFirst() }

  private fun categoryId(transactionId: String): String? = database.readableDatabase.query(
    "taxonomy_transaction_assignments", arrayOf("category_id"), "transaction_id = ?", arrayOf(transactionId), null, null, null, "1",
  ).use { if (it.moveToFirst()) it.getString(0) else null }

  private fun tagIds(transactionId: String): Set<String> = database.readableDatabase.query(
    "taxonomy_transaction_tag_assignments", arrayOf("tag_id"), "transaction_id = ?", arrayOf(transactionId), null, null, "tag_id asc",
  ).use { cursor -> buildSet { while (cursor.moveToNext()) add(cursor.getString(0)) } }

  private fun expectedTagIds(expectedId: String): Set<String> {
    val names = database.readableDatabase.query("expected_movements", arrayOf("tag_names"), "id = ?", arrayOf(expectedId), null, null, null, "1").use {
      if (!it.moveToFirst() || it.isNull(0)) emptyList() else org.json.JSONArray(it.getString(0)).let { json -> (0 until json.length()).map { index -> json.getString(index) } }
    }
    if (names.isEmpty()) return emptySet()
    val placeholders = names.joinToString(",") { "?" }
    return database.readableDatabase.query(
      "taxonomy_tags", arrayOf("id"), "lower(name) in ($placeholders)", names.map { it.lowercase() }.toTypedArray(), null, null, "id asc",
    ).use { cursor -> buildSet { while (cursor.moveToNext()) add(cursor.getString(0)) } }
  }

  private fun String.toAnalyticsType(): AnalyticsMovementType? = when (lowercase()) {
    "income" -> AnalyticsMovementType.INCOME
    "expense" -> AnalyticsMovementType.EXPENSE
    "transfer" -> AnalyticsMovementType.TRANSFER_OUT
    "transfer_in" -> AnalyticsMovementType.TRANSFER_IN
    else -> null
  }
}
