package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Instant
import java.time.ZoneId

@JvmInline
value class AnalyticsFactId(val value: String) {
  init { require(value.isNotBlank()) { "analytics fact id is required" } }
}

sealed interface AnalyticsMovementReference {
  data class Posted(val transactionId: String) : AnalyticsMovementReference {
    init { require(transactionId.isNotBlank()) { "transaction id is required" } }
  }

  data class Expected(
    val expectedMovementId: String,
    val recurringMovementId: String?,
    val occurrenceId: String?,
  ) : AnalyticsMovementReference

  data class ScheduledProjection(
    val recurringMovementId: String,
    val occurrenceId: String,
  ) : AnalyticsMovementReference
}

data class AnalyticsExclusionKey(
  val scopeType: String,
  val scopeId: String,
)

fun interface AnalyticsExclusionReader {
  fun readIgnored(references: Collection<AnalyticsMovementReference>): Set<AnalyticsExclusionKey>
}

object AnalyticsExclusionKeyResolver {
  fun resolve(reference: AnalyticsMovementReference): AnalyticsExclusionKey? = when (reference) {
    is AnalyticsMovementReference.Posted -> AnalyticsExclusionKey("movement", reference.transactionId)
    is AnalyticsMovementReference.Expected -> AnalyticsExclusionKey("expected_movement", reference.expectedMovementId)
    is AnalyticsMovementReference.ScheduledProjection -> null
  }
}

enum class AnalyticsMovementSource {
  POSTED,
  EXPECTED,
  SCHEDULED_PROJECTION,
}

enum class AnalyticsMovementType {
  INCOME,
  EXPENSE,
  TRANSFER_IN,
  TRANSFER_OUT,
}

data class AnalyticsMovementIdentity(val value: String) {
  init {
    require(value.isNotBlank()) { "analytics movement identity is required" }
  }

  companion object {
    fun posted(transactionId: String): AnalyticsMovementIdentity = stable("posted", transactionId)

    fun occurrence(originOccurrenceId: String): AnalyticsMovementIdentity = stable("occurrence", originOccurrenceId)

    fun expected(
      expectedId: String,
      originOccurrenceId: String?,
      originRecurringMovementId: String?,
      resolvedTransactionId: String? = null,
    ): AnalyticsMovementIdentity =
      when {
        !resolvedTransactionId.isNullOrBlank() -> posted(resolvedTransactionId)
        !originOccurrenceId.isNullOrBlank() -> stable("occurrence", originOccurrenceId)
        !originRecurringMovementId.isNullOrBlank() -> stable("expected-series", originRecurringMovementId, expectedId)
        else -> stable("expected", expectedId)
      }

    fun scheduled(originOccurrenceId: String): AnalyticsMovementIdentity = occurrence(originOccurrenceId)

    @Deprecated("Scheduled projections must use the persisted occurrence id")
    fun scheduled(recurringMovementId: String, occurrenceNumber: Int): AnalyticsMovementIdentity =
      stable("legacy-occurrence", recurringMovementId, occurrenceNumber.toString())

    private fun stable(kind: String, vararg parts: String): AnalyticsMovementIdentity =
      AnalyticsMovementIdentity(listOf(kind, *parts).joinToString("/"))
  }
}

data class AnalyticsMovementFact(
  val identity: AnalyticsMovementIdentity,
  val source: AnalyticsMovementSource,
  val effectiveAt: Instant,
  val accountId: String,
  val type: AnalyticsMovementType,
  val currency: CurrencyCode,
  val personalAmount: Money,
  val fullAmount: Money,
  val ignored: Boolean,
  val categoryId: String?,
  val tagIds: Set<String>,
  val destinationAccountId: String? = null,
  val analyticsFactId: AnalyticsFactId = AnalyticsFactId(identity.value),
  val reference: AnalyticsMovementReference = AnalyticsMovementReference.ScheduledProjection("legacy", identity.value),
) {
  val sourceAccountId: String get() = accountId
}

data class AnalyticsPostedMovement(
  val id: String,
  val effectiveAt: Instant,
  val accountId: String,
  val type: AnalyticsMovementType,
  val currency: CurrencyCode,
  val personalAmount: Money,
  val fullAmount: Money,
  val ignored: Boolean = false,
  val categoryId: String? = null,
  val tagIds: Set<String> = emptySet(),
  val occurrenceIdentity: AnalyticsMovementIdentity? = null,
  val destinationAccountId: String? = null,
)

data class AnalyticsExpectedMovement(
  val id: String,
  val effectiveAt: Instant,
  val accountId: String,
  val type: AnalyticsMovementType,
  val currency: CurrencyCode,
  val personalAmount: Money,
  val fullAmount: Money,
  val pending: Boolean,
  val ignored: Boolean = false,
  val categoryId: String? = null,
  val tagIds: Set<String> = emptySet(),
  val originOccurrenceId: String? = null,
  val originRecurringMovementId: String? = null,
  val resolvedTransactionId: String? = null,
  val destinationAccountId: String? = null,
)

data class AnalyticsScheduledProjection(
  val identity: AnalyticsMovementIdentity,
  val effectiveAt: Instant,
  val accountId: String,
  val type: AnalyticsMovementType,
  val currency: CurrencyCode,
  val personalAmount: Money,
  val fullAmount: Money,
  val ignored: Boolean = false,
  val categoryId: String? = null,
  val tagIds: Set<String> = emptySet(),
  val originOccurrenceId: String? = null,
  val recurringMovementId: String? = null,
  val destinationAccountId: String? = null,
)

object AnalyticsOccurrenceIdentityResolver {
  fun posted(transaction: AnalyticsPostedMovement): AnalyticsMovementIdentity =
    transaction.occurrenceIdentity ?: AnalyticsMovementIdentity.posted(transaction.id)

  fun expected(movement: AnalyticsExpectedMovement): AnalyticsMovementIdentity =
    AnalyticsMovementIdentity.expected(
      movement.id,
      movement.originOccurrenceId,
      movement.originRecurringMovementId,
      movement.resolvedTransactionId,
    )

  fun scheduled(projection: AnalyticsScheduledProjection): AnalyticsMovementIdentity =
    projection.originOccurrenceId?.let(AnalyticsMovementIdentity::scheduled) ?: projection.identity
}

class AnalyticsMovementFactAssembler {
  fun assemble(
    posted: Iterable<AnalyticsPostedMovement>,
    expected: Iterable<AnalyticsExpectedMovement>,
    scheduled: Iterable<AnalyticsScheduledProjection>,
    includePlannedMovements: Boolean,
    exclusionReader: AnalyticsExclusionReader? = null,
  ): List<AnalyticsMovementFact> {
    val postedFacts = posted.map { movement ->
      AnalyticsMovementFact(
        identity = AnalyticsOccurrenceIdentityResolver.posted(movement),
        analyticsFactId = AnalyticsFactId(AnalyticsOccurrenceIdentityResolver.posted(movement).value),
        reference = AnalyticsMovementReference.Posted(movement.id),
        source = AnalyticsMovementSource.POSTED,
        effectiveAt = movement.effectiveAt,
        accountId = movement.accountId,
        type = movement.type,
        currency = movement.currency,
        personalAmount = movement.personalAmount,
        fullAmount = movement.fullAmount,
        ignored = movement.ignored,
        categoryId = movement.categoryId,
        tagIds = movement.tagIds,
        destinationAccountId = movement.destinationAccountId,
      )
    }
    if (!includePlannedMovements) {
      return resolveIgnored(postedFacts, exclusionReader)
    }
    val expectedFacts = expected.asSequence()
      .filter { it.pending }
      .map { movement ->
        AnalyticsMovementFact(
          identity = AnalyticsOccurrenceIdentityResolver.expected(movement),
          analyticsFactId = AnalyticsFactId(AnalyticsOccurrenceIdentityResolver.expected(movement).value),
          reference = AnalyticsMovementReference.Expected(
            expectedMovementId = movement.id,
            recurringMovementId = movement.originRecurringMovementId,
            occurrenceId = movement.originOccurrenceId,
          ),
          source = AnalyticsMovementSource.EXPECTED,
          effectiveAt = movement.effectiveAt,
          accountId = movement.accountId,
          type = movement.type,
          currency = movement.currency,
          personalAmount = movement.personalAmount,
          fullAmount = movement.fullAmount,
          ignored = movement.ignored,
          categoryId = movement.categoryId,
          tagIds = movement.tagIds,
          destinationAccountId = movement.destinationAccountId,
        )
      }
    val scheduledFacts = scheduled.map { movement ->
      AnalyticsMovementFact(
        identity = AnalyticsOccurrenceIdentityResolver.scheduled(movement),
        analyticsFactId = AnalyticsFactId(AnalyticsOccurrenceIdentityResolver.scheduled(movement).value),
        reference = AnalyticsMovementReference.ScheduledProjection(
          recurringMovementId = movement.recurringMovementId ?: "legacy",
          occurrenceId = movement.originOccurrenceId ?: movement.identity.value,
        ),
        source = AnalyticsMovementSource.SCHEDULED_PROJECTION,
        effectiveAt = movement.effectiveAt,
        accountId = movement.accountId,
        type = movement.type,
        currency = movement.currency,
        personalAmount = movement.personalAmount,
        fullAmount = movement.fullAmount,
        ignored = movement.ignored,
        categoryId = movement.categoryId,
        tagIds = movement.tagIds,
        destinationAccountId = movement.destinationAccountId,
      )
    }
    return resolveIgnored(postedFacts + expectedFacts.toList() + scheduledFacts, exclusionReader)
  }

  private fun resolveIgnored(
    facts: List<AnalyticsMovementFact>,
    exclusionReader: AnalyticsExclusionReader?,
  ): List<AnalyticsMovementFact> {
    val resolvedFacts = if (exclusionReader == null) {
      facts
    } else {
      val ignoredKeys = exclusionReader.readIgnored(facts.map(AnalyticsMovementFact::reference))
      facts.map { fact ->
        fact.copy(ignored = AnalyticsExclusionKeyResolver.resolve(fact.reference)?.let(ignoredKeys::contains) ?: false)
      }
    }
    return AnalyticsMovementDeduplicator.select(resolvedFacts)
  }
}

data class AnalyticsMovementQueryFilters(
  val currency: CurrencyCode? = null,
  val accountIds: Set<String> = emptySet(),
  val types: Set<AnalyticsMovementType> = emptySet(),
  val categoryId: String? = null,
  val tagIds: Set<String> = emptySet(),
  val includeIgnoredMovements: Boolean = false,
  val useFullAmount: Boolean = false,
)

class AnalyticsMovementFactQueryService(
  private val assembler: AnalyticsMovementFactAssembler = AnalyticsMovementFactAssembler(),
  private val exclusionReader: AnalyticsExclusionReader? = null,
) {
  fun query(
    posted: Iterable<AnalyticsPostedMovement>,
    expected: Iterable<AnalyticsExpectedMovement>,
    scheduled: Iterable<AnalyticsScheduledProjection>,
    filters: AnalyticsMovementQueryFilters = AnalyticsMovementQueryFilters(),
    includePlannedMovements: Boolean = true,
  ): List<AnalyticsMovementFact> = assembler.assemble(posted, expected, scheduled, includePlannedMovements, exclusionReader)
    .asSequence()
    .filter { filters.currency == null || it.currency == filters.currency }
    .filter { filters.accountIds.isEmpty() || it.accountId in filters.accountIds }
    .filter { filters.types.isEmpty() || it.type in filters.types }
    .filter { filters.categoryId == null || it.categoryId == filters.categoryId }
    .filter { filters.tagIds.isEmpty() || it.tagIds.any(filters.tagIds::contains) }
    .filter { filters.includeIgnoredMovements || !it.ignored }
    .toList()
}

object AnalyticsMovementDeduplicator {
  fun select(facts: Iterable<AnalyticsMovementFact>): List<AnalyticsMovementFact> = facts
    .groupBy(AnalyticsMovementFact::identity)
    .values
    .map { candidates -> candidates.maxWith(priorityComparator) }
    .sortedWith(compareBy<AnalyticsMovementFact> { it.effectiveAt }.thenBy { it.identity.value })

  private val priorityComparator = compareBy<AnalyticsMovementFact> { sourcePriority(it.source) }
    .thenByDescending { it.effectiveAt }
    .thenBy { it.identity.value }

  private fun sourcePriority(source: AnalyticsMovementSource): Int = when (source) {
    AnalyticsMovementSource.POSTED -> 3
    AnalyticsMovementSource.EXPECTED -> 2
    AnalyticsMovementSource.SCHEDULED_PROJECTION -> 1
  }
}

data class AnalyticsScheduledOccurrence(
  val identity: AnalyticsMovementIdentity,
  val effectiveAt: Instant,
  val sourceAccountId: String,
  val targetAccountId: String?,
  val occurrenceNumber: Int,
  val originOccurrenceId: String? = null,
)

class AnalyticsScheduledOccurrenceProjector(
  private val scheduleCalculator: RecurrenceScheduleCalculator = RecurrenceScheduleCalculator(),
) {
  fun project(
    movement: RecurringMovement,
    fromInclusive: Instant,
    toExclusive: Instant,
    occurrenceIdFor: (Instant, Int) -> String? = { _, _ -> null },
  ): List<AnalyticsScheduledOccurrence> {
    require(fromInclusive < toExclusive) { "analytics window must be non-empty" }
    if (movement.status != RecurringMovementStatus.ACTIVE) return emptyList()

    val occurrences = mutableListOf<AnalyticsScheduledOccurrence>()
    var dueAt = scheduleCalculator.firstDueAt(movement.startAt, movement.zoneId, movement.rule)
    var occurrenceNumber = 1
    while (dueAt < toExclusive) {
      if (dueAt >= fromInclusive && isAllowedOccurrence(movement, dueAt, occurrenceNumber)) {
        val originOccurrenceId = occurrenceIdFor(dueAt, occurrenceNumber)
        occurrences += AnalyticsScheduledOccurrence(
          identity = originOccurrenceId?.let(AnalyticsMovementIdentity::scheduled)
            ?: AnalyticsMovementIdentity.scheduled(movement.id.toString(), occurrenceNumber),
          effectiveAt = dueAt,
          sourceAccountId = movement.sourceAccountId,
          targetAccountId = movement.targetAccountId,
          occurrenceNumber = occurrenceNumber,
          originOccurrenceId = originOccurrenceId,
        )
      }
      occurrenceNumber += 1
      dueAt = scheduleCalculator.nextDueAt(movement.startAt, movement.zoneId, dueAt, movement.rule)
    }
    return occurrences
  }

  private fun isAllowedOccurrence(movement: RecurringMovement, dueAt: Instant, occurrenceNumber: Int): Boolean {
    if (occurrenceNumber <= movement.generatedOccurrences) return false
    val localDate = dueAt.atZone(ZoneId.of(movement.zoneId)).toLocalDate()
    return when (val end = movement.recurrenceEnd) {
      RecurrenceEnd.Never -> true
      is RecurrenceEnd.OnDate -> !localDate.isAfter(end.date)
      is RecurrenceEnd.AfterOccurrences -> occurrenceNumber <= end.count
    }
  }
}
