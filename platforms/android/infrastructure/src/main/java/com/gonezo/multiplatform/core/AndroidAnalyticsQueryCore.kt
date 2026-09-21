package com.gonezo.multiplatform.core

import com.gonezo.application.query.AnalyticsExpectedMovement
import com.gonezo.application.query.AnalyticsMovementFactQuery
import com.gonezo.application.query.AnalyticsMovementIdentity
import com.gonezo.application.query.AnalyticsMovementReadResult
import com.gonezo.application.query.AnalyticsMovementReadWindow
import com.gonezo.application.query.AnalyticsMovementType
import com.gonezo.application.query.AnalyticsTagReference
import com.gonezo.application.query.AnalyticsTagReferenceResolver
import com.gonezo.application.query.AnalyticsSchedulingOrigin
import com.gonezo.application.query.AnalyticsRecurrenceCadence
import com.gonezo.application.query.AnalyticsCategoryAmount
import com.gonezo.application.query.AnalyticsSharingSummary
import com.gonezo.application.query.AnalyticsPostedMovement
import com.gonezo.application.query.AnalyticsScheduledMovementReader
import com.gonezo.application.query.AnalyticsScheduledProjection
import com.gonezo.application.query.AnalyticsExpectedMovementReader
import com.gonezo.application.query.AnalyticsPostedMovementReader
import com.gonezo.domain.shared.Money
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurrenceCadenceSnapshot
import com.gonezo.recurrence.domain.SchedulingKind
import com.gonezo.application.query.AnalyticsScheduledOccurrenceProjector
import com.gonezo.application.query.AnalyticsMovementQueryFilters
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import com.gonezo.application.services.sharing.SharingAnalyticsAttribution
import com.gonezo.application.services.sharing.SharingAnalyticsAttributionResolver
import com.gonezo.sharing.domain.ExpectedMovementRef
import com.gonezo.sharing.domain.RecurringMovementRef
import com.gonezo.sharing.domain.ports.MovementShareRepository
import com.gonezo.sharing.domain.ports.PlannedMovementShareRepository
import com.gonezo.sharing.domain.ports.RecurringSharePlanRepository

class AndroidAnalyticsQueryCore(private val context: android.content.Context) {
  private val database = CoreDatabase(context.applicationContext)
  private val ledger = AndroidLedgerCore.getInstance(context)
  private val expected = AndroidExpectedCore.getInstance(context)
  private val recurring = AndroidRecurringMovementRepository(database)
  private val occurrences = AndroidRecurringMovementOccurrenceRepository(database)
  private val projector = AnalyticsScheduledOccurrenceProjector()
  private val exclusionReader = AndroidAnalyticsExclusionReader(database)
  private val movementShares: MovementShareRepository = AndroidMovementShareRepository(database)
  private val plannedShares: PlannedMovementShareRepository = AndroidPlannedMovementShareRepository(database)
  private val recurringSharePlans: RecurringSharePlanRepository = AndroidRecurringSharePlanRepository(database)
  private val sharingAttribution = SharingAnalyticsAttributionResolver()

  fun query(fromInclusive: Instant, toExclusive: Instant, includePlannedMovements: Boolean, includeIgnoredMovements: Boolean, currency: String?, accountIds: Set<String> = emptySet(), categoryId: String? = null, tagIds: Set<String> = emptySet()): AnalyticsMovementReadResult {
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
      factQuery = com.gonezo.application.query.AnalyticsMovementFactQueryService(
        exclusionReader = exclusionReader,
      ),
    ).execute(
      window = window,
      filters = AnalyticsMovementQueryFilters(
        currency = currency?.let { com.gonezo.domain.shared.CurrencyCode.from(it) },
        includeIgnoredMovements = includeIgnoredMovements,
        accountIds = accountIds,
        categoryId = categoryId,
        tagIds = tagIds,
      ),
      includePlannedMovements = includePlannedMovements,
    )
    return result
  }

  fun query(fromLocalDate: String, toLocalDate: String, zoneId: String, includePlannedMovements: Boolean, includeIgnoredMovements: Boolean, currency: String?, accountIds: Set<String> = emptySet(), categoryId: String? = null, tagIds: Set<String> = emptySet()): AnalyticsMovementReadResult {
    val zone = ZoneId.of(zoneId)
    val fromInclusive = LocalDate.parse(fromLocalDate).atStartOfDay(zone).toInstant()
    val toExclusive = LocalDate.parse(toLocalDate).plusDays(1).atStartOfDay(zone).toInstant()
    return query(fromInclusive, toExclusive, includePlannedMovements, includeIgnoredMovements, currency, accountIds, categoryId, tagIds)
  }

  private fun posted(window: AnalyticsMovementReadWindow): List<AnalyticsPostedMovement> = ledger.listAccounts().flatMap { account ->
      ledger.listTransactionsHalfOpen(
      account.id, 100, window.fromInclusive.toString(), window.toExclusive.toString(), null, null, true,
    ).filter { it.status.equals("posted", true) }.mapNotNull { transaction ->
      val type = transaction.type.toAnalyticsType() ?: return@mapNotNull null
      val amount = Money(BigDecimal(transaction.amount), transaction.currency)
      val attribution = if (type.isEconomicMovement()) movementShares.findBySourceTransactionId(transaction.id)?.let(sharingAttribution::posted) else null
      val amounts = analyticsMovementAmounts(amount, attribution)
      val occurrence = occurrenceForTransaction(transaction.id)
      val assignedTagIds = tagIds(transaction.id)
      AnalyticsPostedMovement(
        id = transaction.id, effectiveAt = Instant.parse(transaction.occurredAt), accountId = transaction.accountId,
        type = type, currency = com.gonezo.domain.shared.CurrencyCode.from(transaction.currency),
        personalAmount = amounts.personalAmount, fullAmount = amount, ignored = isIgnored("movement", transaction.id),
        categoryId = transaction.categoryId ?: categoryId(transaction.id), tagIds = assignedTagIds,
        splitAmounts = splitAmounts(transaction.id),
        occurrenceIdentity = occurrence?.let { AnalyticsMovementIdentity.occurrence(it.id.toString()) },
        schedulingOrigin = occurrence?.let(::schedulingOrigin),
        sharing = amounts.sharing,
        merchant = transaction.merchant,
        tags = analyticsTags(assignedTagIds, emptyList()),
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
        val attribution = if (type.isEconomicMovement()) plannedShares.findByExpectedMovementRef(ExpectedMovementRef(movement.id))?.let(sharingAttribution::expected) else null
        val amounts = analyticsMovementAmounts(amount, attribution)
        val storedTags = expectedTagSnapshot(movement.id)
        val tags = analyticsTags(storedTags.tagIds, storedTags.tagNames)
        AnalyticsExpectedMovement(
          id = movement.id, effectiveAt = at, accountId = movement.accountId, type = type,
          currency = com.gonezo.domain.shared.CurrencyCode.from(movement.currency), personalAmount = amounts.personalAmount, fullAmount = amount,
          pending = true, ignored = isIgnored("expected_movement", movement.id), categoryId = movement.categoryId,
          tagIds = tags.mapNotNullTo(linkedSetOf(), AnalyticsTagReference::tagId),
          originOccurrenceId = movement.originOccurrenceId, originRecurringMovementId = movement.originRecurringMovementId,
          resolvedTransactionId = movement.resolvedTransactionId,
          schedulingOrigin = schedulingOrigin(movement.originOccurrenceId, movement.originRecurringMovementId),
          sharing = amounts.sharing,
          merchant = movement.merchant,
          tagNames = storedTags.tagNames,
          tags = tags,
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
        val attribution = if (type.isEconomicMovement()) recurringSharePlans.findByRecurringMovementRef(RecurringMovementRef(movement.id.toString()))?.let { sharingAttribution.scheduled(it, amount.amount) } else null
        val amounts = analyticsMovementAmounts(amount, attribution)
        val persistedOccurrence = occurrences.findByRecurringMovementAndDueAt(movement.id, occurrence.effectiveAt)
        val schedulingKind = persistedOccurrence?.schedulingKind ?: movement.schedulingKind
        val tags = analyticsTags(movement.tagIds.toSet(), movement.tagNames)
        AnalyticsScheduledProjection(
          identity = occurrence.identity, effectiveAt = occurrence.effectiveAt, accountId = movement.sourceAccountId,
          type = type, currency = com.gonezo.domain.shared.CurrencyCode.from(movement.currency),
          personalAmount = amounts.personalAmount, fullAmount = amount, categoryId = movement.categoryId,
          originOccurrenceId = occurrence.originOccurrenceId,
          recurringMovementId = movement.id.toString(),
          schedulingOrigin = AnalyticsSchedulingOrigin(
            kind = schedulingKind,
            recurringMovementId = movement.id.toString(),
            occurrenceId = persistedOccurrence?.id?.toString() ?: occurrence.originOccurrenceId,
            cadence = if (schedulingKind == com.gonezo.recurrence.domain.SchedulingKind.RECURRING) {
              analyticsCadence(RecurrenceCadenceSnapshot.from(movement.rule))
            } else null
          ),
          sharing = amounts.sharing,
          merchant = movement.merchant,
          tagIds = tags.mapNotNullTo(linkedSetOf(), AnalyticsTagReference::tagId),
          tagNames = movement.tagNames,
          tags = tags,
        )
      }.filterNotNull()
    }
  }

  private fun occurrenceForTransaction(transactionId: String) = occurrences.findByLedgerTransactionId(transactionId)

  private fun schedulingOrigin(occurrence: com.gonezo.recurrence.domain.RecurringMovementOccurrence) =
    AnalyticsSchedulingOrigin(occurrence.schedulingKind, occurrence.recurringMovementId.toString(), occurrence.id.toString(), occurrence.cadence?.let(::analyticsCadence))

  private fun analyticsCadence(cadence: RecurrenceCadenceSnapshot) =
    AnalyticsRecurrenceCadence(cadence.frequency.value, cadence.interval)

  private fun schedulingOrigin(originOccurrenceId: String?, recurringMovementId: String?): AnalyticsSchedulingOrigin? {
    if (originOccurrenceId != null) {
      val occurrence = occurrences.findById(UUID.fromString(originOccurrenceId)) ?: return null
      return schedulingOrigin(occurrence)
    }
    val recurringId = recurringMovementId ?: return null
    val movement = recurring.findById(RecurringMovementId.from(recurringId)) ?: return null
    return AnalyticsSchedulingOrigin(movement.schedulingKind, recurringId)
  }

  private fun isIgnored(scopeType: String, scopeId: String): Boolean = database.readableDatabase.query(
    "analytics_exclusions", arrayOf("id"), "scope_type = ? and scope_id = ? and reason = ?",
    arrayOf(scopeType, scopeId, "user_ignored"), null, null, null, "1",
  ).use { it.moveToFirst() }

  private fun categoryId(transactionId: String): String? = database.readableDatabase.query(
    "taxonomy_transaction_assignments", arrayOf("category_id"), "transaction_id = ?", arrayOf(transactionId), null, null, null, "1",
  ).use { if (it.moveToFirst()) it.getString(0) else null }

  private fun splitAmounts(transactionId: String): List<AnalyticsCategoryAmount> = database.readableDatabase.rawQuery(
    "select assignments.category_id, items.amount from ledger_transaction_items items " +
      "left join taxonomy_transaction_item_category_assignments assignments on assignments.transaction_item_id = items.id " +
      "where items.transaction_id = ? order by items.id asc",
    arrayOf(transactionId),
  ).use { cursor -> buildList {
    while (cursor.moveToNext()) add(AnalyticsCategoryAmount(cursor.getString(0), BigDecimal(cursor.getString(1))))
  } }

  private fun tagIds(transactionId: String): Set<String> = database.readableDatabase.query(
    "taxonomy_transaction_tag_assignments", arrayOf("tag_id"), "transaction_id = ?", arrayOf(transactionId), null, null, "tag_id asc",
  ).use { cursor -> buildSet { while (cursor.moveToNext()) add(cursor.getString(0)) } }

  private fun expectedTagSnapshot(expectedId: String): StoredTagSnapshot = database.readableDatabase.query(
    "expected_movements", arrayOf("tag_ids", "tag_names"), "id = ?", arrayOf(expectedId), null, null, null, "1",
  ).use { cursor ->
    if (!cursor.moveToFirst()) return StoredTagSnapshot(emptySet(), emptyList())
    StoredTagSnapshot(decodeTags(cursor.getString(0)).toSet(), decodeTags(cursor.getString(1)))
  }

  private fun analyticsTags(tagIds: Collection<String>, tagNames: List<String>): List<AnalyticsTagReference> {
    val tags = AndroidTaxonomyTagRepository(database).listAll()
    return AnalyticsTagReferenceResolver.resolve(
      tagIds = tagIds,
      tagNames = tagNames,
      displayNamesById = tags.associate { it.id.toString() to it.name },
      idsByNormalizedName = tags.associate { com.gonezo.taxonomy.domain.TagName.normalizeTagName(it.name) to it.id.toString() },
      normalizeName = com.gonezo.taxonomy.domain.TagName::normalizeTagName,
    )
  }

  private fun decodeTags(raw: String?): List<String> {
    if (raw.isNullOrBlank()) return emptyList()
    val json = org.json.JSONArray(raw)
    return buildList { for (index in 0 until json.length()) add(json.getString(index)) }
  }

  private data class StoredTagSnapshot(val tagIds: Set<String>, val tagNames: List<String>)

  private fun String.toAnalyticsType(): AnalyticsMovementType? = when (lowercase()) {
    "income" -> AnalyticsMovementType.INCOME
    "expense" -> AnalyticsMovementType.EXPENSE
    "transfer" -> AnalyticsMovementType.TRANSFER_OUT
    "transfer_in" -> AnalyticsMovementType.TRANSFER_IN
    else -> null
  }

  private fun AnalyticsMovementType.isEconomicMovement(): Boolean = this == AnalyticsMovementType.EXPENSE || this == AnalyticsMovementType.INCOME

  private fun analyticsMovementAmounts(fullAmount: Money, attribution: SharingAnalyticsAttribution?): AnalyticsMovementAmounts =
    attribution?.let {
      AnalyticsMovementAmounts(
        personalAmount = Money(it.personalAmount(fullAmount.amount), fullAmount.currency),
        sharing = AnalyticsSharingSummary(
          it.participantCount,
          it.settlementParticipantCount,
          Money(it.participantAllocatedAmount, fullAmount.currency),
          Money(it.settlementRequiredAmount, fullAmount.currency),
        ),
      )
    } ?: AnalyticsMovementAmounts(fullAmount, null)

  private data class AnalyticsMovementAmounts(val personalAmount: Money, val sharing: AnalyticsSharingSummary?)
}
