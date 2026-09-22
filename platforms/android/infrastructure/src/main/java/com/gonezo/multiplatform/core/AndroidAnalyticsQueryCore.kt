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
    val taxonomyTags = AndroidTaxonomyTagRepository(database).listAll()
    val sharesByTransaction = movementShares.listAll().associateBy { it.sourceTransactionId }
    val plannedSharesByExpected = plannedShares.listAll().associateBy { it.expectedMovementRef.value }
    val sharingPlansByRecurring = recurringSharePlans.listAll().associateBy { it.recurringMovementRef.value }
    val result = AnalyticsMovementFactQuery(
      postedReader = object : AnalyticsPostedMovementReader {
        override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsPostedMovement> = posted(window, taxonomyTags, sharesByTransaction)
      },
      expectedReader = object : AnalyticsExpectedMovementReader {
        override fun readPending(window: AnalyticsMovementReadWindow): Iterable<AnalyticsExpectedMovement> = pendingExpected(window, taxonomyTags, plannedSharesByExpected)
      },
      scheduledReader = object : AnalyticsScheduledMovementReader {
        override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsScheduledProjection> = scheduled(window, taxonomyTags, sharingPlansByRecurring)
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

  private fun posted(window: AnalyticsMovementReadWindow, taxonomyTags: List<com.gonezo.taxonomy.domain.Tag>, sharesByTransaction: Map<String, com.gonezo.sharing.domain.MovementShare>): List<AnalyticsPostedMovement> {
    val transactions = ledger.listAccounts().flatMap { account ->
      ledger.listTransactionsHalfOpen(
        account.id, 100, window.fromInclusive.toString(), window.toExclusive.toString(), null, null, true,
      ).filter { it.status.equals("posted", true) }
    }
    val transactionIds = transactions.map { it.id }
    val tagIdsByTransaction = tagIdsByTransaction(transactionIds)
    val categoryIdsByTransaction = categoryIdsByTransaction(transactionIds)
    val splitAmountsByTransaction = splitAmountsByTransaction(transactionIds)
    val occurrencesByTransaction = occurrences.listAll().mapNotNull { occurrence -> occurrence.ledgerTransactionId?.let { it to occurrence } }.toMap()
    return transactions.mapNotNull { transaction ->
      val type = transaction.type.toAnalyticsType() ?: return@mapNotNull null
      val amount = Money(BigDecimal(transaction.amount), transaction.currency)
      val attribution = if (type.isEconomicMovement()) sharesByTransaction[transaction.id]?.let(sharingAttribution::posted) else null
      val amounts = analyticsMovementAmounts(amount, attribution)
      val occurrence = occurrencesByTransaction[transaction.id]
      val assignedTagIds = tagIdsByTransaction[transaction.id].orEmpty()
      AnalyticsPostedMovement(
        id = transaction.id, effectiveAt = Instant.parse(transaction.occurredAt), accountId = transaction.accountId,
        type = type, currency = com.gonezo.domain.shared.CurrencyCode.from(transaction.currency),
        personalAmount = amounts.personalAmount, fullAmount = amount, ignored = false,
        categoryId = transaction.categoryId ?: categoryIdsByTransaction[transaction.id], tagIds = assignedTagIds,
        splitAmounts = splitAmountsByTransaction[transaction.id].orEmpty(),
        occurrenceIdentity = occurrence?.let { AnalyticsMovementIdentity.occurrence(it.id.toString()) },
        schedulingOrigin = occurrence?.let(::schedulingOrigin),
        sharing = amounts.sharing,
        merchant = transaction.merchant,
        tags = analyticsTags(assignedTagIds, emptyList(), taxonomyTags),
      )
    }
  }

  private fun pendingExpected(window: AnalyticsMovementReadWindow, taxonomyTags: List<com.gonezo.taxonomy.domain.Tag>, plannedSharesByExpected: Map<String, com.gonezo.sharing.domain.PlannedMovementShare>): List<AnalyticsExpectedMovement> = ledger.listAccounts().flatMap { account ->
    expected.listMovements(account.id, false).filter { it.status.equals("pending", true) }
      .mapNotNull { movement ->
        val at = Instant.parse(movement.expectedAt)
        if (!window.contains(at)) return@mapNotNull null
        val type = movement.type.toAnalyticsType() ?: return@mapNotNull null
        val amount = Money(BigDecimal(movement.amount), movement.currency)
        val attribution = if (type.isEconomicMovement()) plannedSharesByExpected[movement.id]?.let(sharingAttribution::expected) else null
        val amounts = analyticsMovementAmounts(amount, attribution)
        val tags = analyticsTags(movement.tagIds, movement.tagNames, taxonomyTags)
        AnalyticsExpectedMovement(
          id = movement.id, effectiveAt = at, accountId = movement.accountId, type = type,
          currency = com.gonezo.domain.shared.CurrencyCode.from(movement.currency), personalAmount = amounts.personalAmount, fullAmount = amount,
          pending = true, ignored = false, categoryId = movement.categoryId,
          tagIds = tags.mapNotNullTo(linkedSetOf(), AnalyticsTagReference::tagId),
          originOccurrenceId = movement.originOccurrenceId, originRecurringMovementId = movement.originRecurringMovementId,
          resolvedTransactionId = movement.resolvedTransactionId,
          schedulingOrigin = schedulingOrigin(movement.originOccurrenceId, movement.originRecurringMovementId),
          sharing = amounts.sharing,
          merchant = movement.merchant,
          tagNames = movement.tagNames,
          tags = tags,
        )
      }
  }

  private fun scheduled(window: AnalyticsMovementReadWindow, taxonomyTags: List<com.gonezo.taxonomy.domain.Tag>, sharingPlansByRecurring: Map<String, com.gonezo.sharing.domain.RecurringSharePlan>): List<AnalyticsScheduledProjection> {
    val movements = ledger.listAccounts().flatMap { recurring.listBySourceAccount(it.id) }.distinctBy { it.id }
    val persistedOccurrences = occurrences.listAll().associateBy { it.recurringMovementId to it.dueAt }
    return movements.flatMap { movement ->
      projector.project(movement, window.fromInclusive, window.toExclusive) { dueAt, _ ->
        persistedOccurrences[movement.id to dueAt]?.id?.toString()
      }.map { occurrence ->
        val type = movement.type.value.toAnalyticsType() ?: return@map null
        val amount = Money(movement.amount, movement.currency)
        val attribution = if (type.isEconomicMovement()) sharingPlansByRecurring[movement.id.toString()]?.let { sharingAttribution.scheduled(it, amount.amount) } else null
        val amounts = analyticsMovementAmounts(amount, attribution)
        val persistedOccurrence = persistedOccurrences[movement.id to occurrence.effectiveAt]
        val schedulingKind = persistedOccurrence?.schedulingKind ?: movement.schedulingKind
        val tags = analyticsTags(movement.tagIds.toSet(), movement.tagNames, taxonomyTags)
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

  private fun tagIdsByTransaction(transactionIds: Collection<String>): Map<String, Set<String>> {
    if (transactionIds.isEmpty()) return emptyMap()
    val placeholders = transactionIds.joinToString(",") { "?" }
    return database.readableDatabase.query(
      "taxonomy_transaction_tag_assignments", arrayOf("transaction_id", "tag_id"), "transaction_id in ($placeholders)", transactionIds.toTypedArray(), null, null, "transaction_id asc, tag_id asc",
    ).use { cursor ->
      buildMap {
        while (cursor.moveToNext()) {
          val transactionId = cursor.getString(0)
          put(transactionId, (get(transactionId).orEmpty() + cursor.getString(1)).toSet())
        }
      }
    }
  }

  private fun categoryIdsByTransaction(transactionIds: Collection<String>): Map<String, String> {
    if (transactionIds.isEmpty()) return emptyMap()
    val placeholders = transactionIds.joinToString(",") { "?" }
    return database.readableDatabase.query(
      "taxonomy_transaction_assignments", arrayOf("transaction_id", "category_id"), "transaction_id in ($placeholders)", transactionIds.toTypedArray(), null, null, "transaction_id asc",
    ).use { cursor ->
      buildMap { while (cursor.moveToNext()) put(cursor.getString(0), cursor.getString(1)) }
    }
  }

  private fun splitAmountsByTransaction(transactionIds: Collection<String>): Map<String, List<AnalyticsCategoryAmount>> {
    if (transactionIds.isEmpty()) return emptyMap()
    val placeholders = transactionIds.joinToString(",") { "?" }
    return database.readableDatabase.rawQuery(
      "select items.transaction_id, assignments.category_id, items.amount from ledger_transaction_items items " +
        "left join taxonomy_transaction_item_category_assignments assignments on assignments.transaction_item_id = items.id " +
        "where items.transaction_id in ($placeholders) order by items.transaction_id asc, items.id asc",
      transactionIds.toTypedArray(),
    ).use { cursor ->
      buildMap {
        while (cursor.moveToNext()) {
          val transactionId = cursor.getString(0)
          val allocation = AnalyticsCategoryAmount(cursor.getString(1), BigDecimal(cursor.getString(2)))
          put(transactionId, get(transactionId).orEmpty() + allocation)
        }
      }
    }
  }

  private fun analyticsTags(tagIds: Collection<String>, tagNames: List<String>, tags: List<com.gonezo.taxonomy.domain.Tag>): List<AnalyticsTagReference> {
    return AnalyticsTagReferenceResolver.resolve(
      tagIds = tagIds,
      tagNames = tagNames,
      displayNamesById = tags.associate { it.id.toString() to it.name },
      idsByNormalizedName = tags.associate { com.gonezo.taxonomy.domain.TagName.normalizeTagName(it.name) to it.id.toString() },
      normalizeName = com.gonezo.taxonomy.domain.TagName::normalizeTagName,
    )
  }

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
