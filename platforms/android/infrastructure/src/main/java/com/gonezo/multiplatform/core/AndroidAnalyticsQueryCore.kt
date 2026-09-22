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

  private data class NativeAnalyticsReadContext(
    val accounts: List<AndroidLedgerCore.LedgerAccountView>,
    val recurringMovements: List<com.gonezo.recurrence.domain.RecurringMovement>,
    val occurrences: List<com.gonezo.recurrence.domain.RecurringMovementOccurrence>,
    val occurrencesByTransactionId: Map<String, com.gonezo.recurrence.domain.RecurringMovementOccurrence>,
    val occurrencesBySeriesAndDueAt: Map<Pair<com.gonezo.recurrence.domain.RecurringMovementId, Instant>, com.gonezo.recurrence.domain.RecurringMovementOccurrence>,
    val taxonomyTags: List<com.gonezo.taxonomy.domain.Tag>,
    val tagDisplayNamesById: Map<String, String>,
    val tagIdsByNormalizedName: Map<String, String>,
    val sharesByTransaction: Map<String, com.gonezo.sharing.domain.MovementShare>,
    val plannedSharesByExpected: Map<String, com.gonezo.sharing.domain.PlannedMovementShare>,
    val sharingPlansByRecurring: Map<String, com.gonezo.sharing.domain.RecurringSharePlan>,
  )

  fun query(fromInclusive: Instant, toExclusive: Instant, includePlannedMovements: Boolean, includeIgnoredMovements: Boolean, currency: String?, accountIds: Set<String> = emptySet(), categoryId: String? = null, tagIds: Set<String> = emptySet()): AnalyticsMovementReadResult {
    val window = AnalyticsMovementReadWindow(fromInclusive, toExclusive)
    val readContext = readContext()
    val result = AnalyticsMovementFactQuery(
      postedReader = object : AnalyticsPostedMovementReader {
        override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsPostedMovement> = posted(window, readContext)
      },
      expectedReader = object : AnalyticsExpectedMovementReader {
        override fun readPending(window: AnalyticsMovementReadWindow): Iterable<AnalyticsExpectedMovement> = pendingExpected(window, readContext)
      },
      scheduledReader = object : AnalyticsScheduledMovementReader {
        override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsScheduledProjection> = scheduled(window, readContext)
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

  private fun readContext(): NativeAnalyticsReadContext {
    val accounts = ledger.listAccounts()
    val occurrences = occurrences.listAll()
    val taxonomyTags = AndroidTaxonomyTagRepository(database).listAll()
    return NativeAnalyticsReadContext(
      accounts = accounts,
      recurringMovements = recurring.listAll(),
      occurrences = occurrences,
      occurrencesByTransactionId = occurrences.mapNotNull { occurrence -> occurrence.ledgerTransactionId?.let { it to occurrence } }.toMap(),
      occurrencesBySeriesAndDueAt = occurrences.associateBy { it.recurringMovementId to it.dueAt },
      taxonomyTags = taxonomyTags,
      tagDisplayNamesById = taxonomyTags.associate { it.id.toString() to it.name },
      tagIdsByNormalizedName = taxonomyTags.associate { com.gonezo.taxonomy.domain.TagName.normalizeTagName(it.name) to it.id.toString() },
      sharesByTransaction = movementShares.listAll().associateBy { it.sourceTransactionId },
      plannedSharesByExpected = plannedShares.listAll().associateBy { it.expectedMovementRef.value },
      sharingPlansByRecurring = recurringSharePlans.listAll().associateBy { it.recurringMovementRef.value },
    )
  }

  fun query(fromLocalDate: String, toLocalDate: String, zoneId: String, includePlannedMovements: Boolean, includeIgnoredMovements: Boolean, currency: String?, accountIds: Set<String> = emptySet(), categoryId: String? = null, tagIds: Set<String> = emptySet()): AnalyticsMovementReadResult {
    val zone = ZoneId.of(zoneId)
    val fromInclusive = LocalDate.parse(fromLocalDate).atStartOfDay(zone).toInstant()
    val toExclusive = LocalDate.parse(toLocalDate).plusDays(1).atStartOfDay(zone).toInstant()
    return query(fromInclusive, toExclusive, includePlannedMovements, includeIgnoredMovements, currency, accountIds, categoryId, tagIds)
  }

  private fun posted(window: AnalyticsMovementReadWindow, readContext: NativeAnalyticsReadContext): List<AnalyticsPostedMovement> {
    val transactions = readContext.accounts.flatMap { account ->
      ledger.listTransactionsHalfOpen(
        account.id, 100, window.fromInclusive.toString(), window.toExclusive.toString(), null, null, true,
      ).filter { it.status.equals("posted", true) }
    }
    val transactionIds = transactions.map { it.id }
    val tagIdsByTransaction = tagIdsByTransaction(transactionIds)
    val categoryIdsByTransaction = categoryIdsByTransaction(transactionIds)
    val splitAmountsByTransaction = splitAmountsByTransaction(transactionIds)
    return transactions.mapNotNull { transaction ->
      val type = transaction.type.toAnalyticsType() ?: return@mapNotNull null
      val amount = Money(BigDecimal(transaction.amount), transaction.currency)
      val attribution = if (type.isEconomicMovement()) readContext.sharesByTransaction[transaction.id]?.let(sharingAttribution::posted) else null
      val amounts = analyticsMovementAmounts(amount, attribution)
      val occurrence = readContext.occurrencesByTransactionId[transaction.id]
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
        tags = analyticsTags(assignedTagIds, emptyList(), readContext),
      )
    }
  }

  private fun pendingExpected(window: AnalyticsMovementReadWindow, readContext: NativeAnalyticsReadContext): List<AnalyticsExpectedMovement> = readContext.accounts.flatMap { account ->
    expected.listMovements(account.id, false).filter { it.status.equals("pending", true) }
      .mapNotNull { movement ->
        val at = Instant.parse(movement.expectedAt)
        if (!window.contains(at)) return@mapNotNull null
        val type = movement.type.toAnalyticsType() ?: return@mapNotNull null
        val amount = Money(BigDecimal(movement.amount), movement.currency)
        val attribution = if (type.isEconomicMovement()) readContext.plannedSharesByExpected[movement.id]?.let(sharingAttribution::expected) else null
        val amounts = analyticsMovementAmounts(amount, attribution)
        val tags = analyticsTags(movement.tagIds, movement.tagNames, readContext)
        AnalyticsExpectedMovement(
          id = movement.id, effectiveAt = at, accountId = movement.accountId, type = type,
          currency = com.gonezo.domain.shared.CurrencyCode.from(movement.currency), personalAmount = amounts.personalAmount, fullAmount = amount,
          pending = true, ignored = false, categoryId = movement.categoryId,
          tagIds = tags.mapNotNullTo(linkedSetOf(), AnalyticsTagReference::tagId),
          originOccurrenceId = movement.originOccurrenceId, originRecurringMovementId = movement.originRecurringMovementId,
          resolvedTransactionId = movement.resolvedTransactionId,
          schedulingOrigin = schedulingOrigin(movement.originOccurrenceId, movement.originRecurringMovementId, readContext),
          sharing = amounts.sharing,
          merchant = movement.merchant,
          tagNames = movement.tagNames,
          tags = tags,
        )
      }
  }

  private fun scheduled(window: AnalyticsMovementReadWindow, readContext: NativeAnalyticsReadContext): List<AnalyticsScheduledProjection> {
    val persistedOccurrences = readContext.occurrencesBySeriesAndDueAt
    return readContext.recurringMovements.flatMap { movement ->
      projector.project(movement, window.fromInclusive, window.toExclusive) { dueAt, _ ->
        persistedOccurrences[movement.id to dueAt]?.id?.toString()
      }.map { occurrence ->
        val type = movement.type.value.toAnalyticsType() ?: return@map null
        val amount = Money(movement.amount, movement.currency)
        val attribution = if (type.isEconomicMovement()) readContext.sharingPlansByRecurring[movement.id.toString()]?.let { sharingAttribution.scheduled(it, amount.amount) } else null
        val amounts = analyticsMovementAmounts(amount, attribution)
        val persistedOccurrence = persistedOccurrences[movement.id to occurrence.effectiveAt]
        val schedulingKind = persistedOccurrence?.schedulingKind ?: movement.schedulingKind
        val tags = analyticsTags(movement.tagIds.toSet(), movement.tagNames, readContext)
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

  private fun schedulingOrigin(originOccurrenceId: String?, recurringMovementId: String?, readContext: NativeAnalyticsReadContext): AnalyticsSchedulingOrigin? {
    if (originOccurrenceId != null) {
      val occurrence = readContext.occurrences.firstOrNull { it.id.toString() == originOccurrenceId } ?: return null
      return schedulingOrigin(occurrence)
    }
    val recurringId = recurringMovementId ?: return null
    val movement = readContext.recurringMovements.firstOrNull { it.id.toString() == recurringId } ?: return null
    return AnalyticsSchedulingOrigin(movement.schedulingKind, recurringId)
  }

  private fun tagIdsByTransaction(transactionIds: Collection<String>): Map<String, Set<String>> {
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

  private fun analyticsTags(tagIds: Collection<String>, tagNames: List<String>, readContext: NativeAnalyticsReadContext): List<AnalyticsTagReference> {
    return AnalyticsTagReferenceResolver.resolve(
      tagIds = tagIds,
      tagNames = tagNames,
      displayNamesById = readContext.tagDisplayNamesById,
      idsByNormalizedName = readContext.tagIdsByNormalizedName,
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
