package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import java.math.BigDecimal
import java.time.Instant
import java.time.Clock
import java.time.ZoneId
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AnalyticsMovementFactsTest {
  private val effectiveAt = Instant.parse("2026-01-01T00:00:00Z")
  private val currency = CurrencyCode.from("EUR")

  @Test
  fun `posted takes precedence over expected and scheduled projection`() {
    val identity = AnalyticsMovementIdentity.scheduled("series", 1)
    val facts = listOf(
      fact(identity, AnalyticsMovementSource.SCHEDULED_PROJECTION, "1.00"),
      fact(identity, AnalyticsMovementSource.EXPECTED, "2.00"),
      fact(identity, AnalyticsMovementSource.POSTED, "3.00"),
    )

    val selected = AnalyticsMovementDeduplicator.select(facts)

    assertThat(selected).hasSize(1)
    assertThat(selected.single().source).isEqualTo(AnalyticsMovementSource.POSTED)
    assertThat(selected.single().fullAmount.amount).isEqualByComparingTo("3.00")
  }

  @Test
  fun `different occurrences and series are retained`() {
    val facts = listOf(
      fact(AnalyticsMovementIdentity.scheduled("series-a", 1), AnalyticsMovementSource.SCHEDULED_PROJECTION),
      fact(AnalyticsMovementIdentity.scheduled("series-a", 2), AnalyticsMovementSource.SCHEDULED_PROJECTION),
      fact(AnalyticsMovementIdentity.scheduled("series-b", 1), AnalyticsMovementSource.SCHEDULED_PROJECTION),
    )

    assertThat(AnalyticsMovementDeduplicator.select(facts)).hasSize(3)
  }

  @Test
  fun `assembler includes pending expected and deduplicates scheduled occurrence`() {
    val identity = AnalyticsMovementIdentity.occurrence("occurrence-1")
    val expected = AnalyticsExpectedMovement(
      id = "expected-1",
      effectiveAt = effectiveAt,
      accountId = "account",
      type = AnalyticsMovementType.INCOME,
      currency = currency,
      personalAmount = Money.of(BigDecimal("2045.96"), "EUR"),
      fullAmount = Money.of(BigDecimal("2045.96"), "EUR"),
      pending = true,
      originOccurrenceId = "occurrence-1",
    )
    val scheduled = AnalyticsScheduledProjection(
      identity = identity,
      effectiveAt = effectiveAt,
      accountId = "account",
      type = AnalyticsMovementType.INCOME,
      currency = currency,
      personalAmount = Money.of(BigDecimal("2045.96"), "EUR"),
      fullAmount = Money.of(BigDecimal("2045.96"), "EUR"),
    )

    val selected = AnalyticsMovementFactAssembler().assemble(
      posted = emptyList(),
      expected = listOf(expected),
      scheduled = listOf(scheduled),
      includePlannedMovements = true,
    )

    assertThat(selected).hasSize(1)
    assertThat(selected.single().source).isEqualTo(AnalyticsMovementSource.EXPECTED)
    assertThat(selected.single().fullAmount.amount).isEqualByComparingTo("2045.96")
  }

  @Test
  fun `persisted occurrence identity is shared by expected and scheduled`() {
    val occurrenceId = "00000000-0000-4000-8000-000000000001"
    val expected = AnalyticsExpectedMovement(
      id = "expected-1", effectiveAt = effectiveAt, accountId = "account",
      type = AnalyticsMovementType.INCOME, currency = currency,
      personalAmount = Money.of(BigDecimal("2045.96"), "EUR"),
      fullAmount = Money.of(BigDecimal("2045.96"), "EUR"), pending = true,
      originOccurrenceId = occurrenceId,
    )
    val scheduled = AnalyticsScheduledProjection(
      identity = AnalyticsMovementIdentity.scheduled("series", 1), effectiveAt = effectiveAt,
      accountId = "account", type = AnalyticsMovementType.INCOME, currency = currency,
      personalAmount = expected.personalAmount, fullAmount = expected.fullAmount,
      originOccurrenceId = occurrenceId,
    )

    val facts = AnalyticsMovementFactAssembler().assemble(emptyList(), listOf(expected), listOf(scheduled), true)

    val fact = facts.single()
    assertThat(fact.identity).isEqualTo(AnalyticsMovementIdentity.occurrence(occurrenceId))
    assertThat(fact.source).isEqualTo(AnalyticsMovementSource.EXPECTED)
  }

  @Test
  fun `query reads all three sources and planned false is posted only`() {
    val expected = AnalyticsExpectedMovement(
      id = "expected-1", effectiveAt = effectiveAt, accountId = "account",
      type = AnalyticsMovementType.INCOME, currency = currency,
      personalAmount = Money.of(BigDecimal("2045.96"), "EUR"),
      fullAmount = Money.of(BigDecimal("2045.96"), "EUR"), pending = true,
    )
    val posted = AnalyticsPostedMovement(
      id = "posted-1", effectiveAt = effectiveAt, accountId = "account",
      type = AnalyticsMovementType.INCOME, currency = currency,
      personalAmount = Money.of(BigDecimal("10.00"), "EUR"),
      fullAmount = Money.of(BigDecimal("10.00"), "EUR"),
    )
    var reads = 0
    val query = AnalyticsMovementFactQuery(
      postedReader = object : AnalyticsPostedMovementReader {
        override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsPostedMovement> { reads++; return listOf(posted) }
      },
      expectedReader = object : AnalyticsExpectedMovementReader {
        override fun readPending(window: AnalyticsMovementReadWindow): Iterable<AnalyticsExpectedMovement> { reads++; return listOf(expected) }
      },
      scheduledReader = object : AnalyticsScheduledMovementReader {
        override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsScheduledProjection> { reads++; return emptyList() }
      },
    )
    val window = AnalyticsMovementReadWindow(effectiveAt.minusSeconds(1), effectiveAt.plusSeconds(1))

    val planned = query.execute(window, includePlannedMovements = true)
    val postedOnly = query.execute(window, includePlannedMovements = false)

    assertThat(planned.facts).hasSize(2)
    assertThat(planned.totals.income.amount).isEqualByComparingTo("2055.96")
    assertThat(planned.totals.netFlow.amount).isEqualByComparingTo("2055.96")
    assertThat(postedOnly.facts).hasSize(1)
    assertThat(postedOnly.totals.income.amount).isEqualByComparingTo("10.00")
    assertThat(reads).isEqualTo(4)
  }

  @Test
  fun `july planned income regression contributes exactly once to analytics`() {
    val occurrenceId = "occurrence-july-29"
    val amount = Money.of(BigDecimal("2045.96"), "EUR")
    val expected = AnalyticsExpectedMovement(
      id = "expected-july", effectiveAt = Instant.parse("2026-07-29T05:41:00Z"), accountId = "account",
      type = AnalyticsMovementType.INCOME, currency = currency, personalAmount = amount, fullAmount = amount,
      pending = true, originOccurrenceId = occurrenceId,
    )
    val scheduled = AnalyticsScheduledProjection(
      identity = AnalyticsMovementIdentity.scheduled("legacy-series", 4),
      effectiveAt = expected.effectiveAt, accountId = "account", type = expected.type, currency = currency,
      personalAmount = amount, fullAmount = amount, originOccurrenceId = occurrenceId,
    )
    val query = AnalyticsMovementFactQuery(
      postedReader = object : AnalyticsPostedMovementReader { override fun read(window: AnalyticsMovementReadWindow) = emptyList<AnalyticsPostedMovement>() },
      expectedReader = object : AnalyticsExpectedMovementReader { override fun readPending(window: AnalyticsMovementReadWindow) = listOf(expected) },
      scheduledReader = object : AnalyticsScheduledMovementReader { override fun read(window: AnalyticsMovementReadWindow) = listOf(scheduled) },
    )
    val resolver = AnalyticsWindowResolver(
      Clock.fixed(Instant.parse("2026-07-24T12:00:00Z"), ZoneId.of("Europe/Madrid")),
      ZoneId.of("Europe/Madrid"),
    )
    val resolved = resolver.resolve(AnalyticsPeriodSelection(AnalyticsPeriodKind.THIS_MONTH), true).current!!
    val result = query.execute(AnalyticsMovementReadWindow(resolved.fromInclusive, resolved.toExclusive), includePlannedMovements = true)

    assertThat(resolved.toExclusive).isEqualTo(Instant.parse("2026-07-31T22:00:00Z"))
    assertThat(result.facts).hasSize(1)
    assertThat(result.facts.single().effectiveAt).isEqualTo(expected.effectiveAt)
    assertThat(result.totals.income.amount).isEqualByComparingTo("2045.96")
    assertThat(result.totals.netFlow.amount).isEqualByComparingTo("2045.96")
    assertThat(result.totals.expenses.amount).isEqualByComparingTo("0")
  }

  @Test
  fun `resolved expected maps to its posted identity and planned disabled returns only posted`() {
    val posted = AnalyticsPostedMovement(
      id = "transaction-1",
      effectiveAt = effectiveAt,
      accountId = "account",
      type = AnalyticsMovementType.INCOME,
      currency = currency,
      personalAmount = Money.of(BigDecimal("10.00"), "EUR"),
      fullAmount = Money.of(BigDecimal("10.00"), "EUR"),
    )
    val resolved = AnalyticsExpectedMovement(
      id = "expected-1",
      effectiveAt = effectiveAt,
      accountId = "account",
      type = AnalyticsMovementType.INCOME,
      currency = currency,
      personalAmount = Money.of(BigDecimal("99.00"), "EUR"),
      fullAmount = Money.of(BigDecimal("99.00"), "EUR"),
      pending = false,
      resolvedTransactionId = "transaction-1",
    )

    val assembler = AnalyticsMovementFactAssembler()
    assertThat(assembler.assemble(listOf(posted), listOf(resolved), emptyList(), true)).hasSize(1)
    assertThat(assembler.assemble(listOf(posted), emptyList(), emptyList(), false)).hasSize(1)
    assertThat(assembler.assemble(emptyList(), listOf(resolved), emptyList(), true)).isEmpty()
  }

  @Test
  fun `query applies tags, currency, ignored and account filters after deduplication`() {
    val fact = AnalyticsPostedMovement(
      id = "posted-1",
      effectiveAt = effectiveAt,
      accountId = "account",
      type = AnalyticsMovementType.EXPENSE,
      currency = currency,
      personalAmount = Money.of(BigDecimal("1.00"), "EUR"),
      fullAmount = Money.of(BigDecimal("2.00"), "EUR"),
      ignored = true,
      tagIds = setOf("food"),
    )
    val service = AnalyticsMovementFactQueryService()
    assertThat(service.query(
      posted = listOf(fact),
      expected = emptyList(),
      scheduled = emptyList(),
      filters = AnalyticsMovementQueryFilters(tagIds = setOf("travel")),
    )).isEmpty()
    assertThat(service.query(
      posted = listOf(fact),
      expected = emptyList(),
      scheduled = emptyList(),
      filters = AnalyticsMovementQueryFilters(tagIds = setOf("food"), includeIgnoredMovements = true),
    )).hasSize(1)
  }

  @Test
  fun `scheduled projection uses a half open window and skips consumed occurrences`() {
    val startAt = Instant.parse("2026-01-01T10:00:00Z")
    val movement = RecurringMovement.create(
      id = RecurringMovementId(UUID.fromString("00000000-0000-0000-0000-000000000001")),
      type = com.gonezo.recurrence.domain.RecurringMovementType.EXPENSE,
      sourceAccountId = "account",
      targetAccountId = null,
      amount = BigDecimal("10.00"),
      currency = "EUR",
      destinationAmount = null,
      destinationCurrency = null,
      exchangeRate = null,
      description = "Daily",
      merchant = null,
      categoryId = null,
      reviewPolicy = RecurringMovementReviewPolicy.AUTOMATIC,
      rule = RecurrenceRule(RecurrenceFrequency.DAILY),
      recurrenceEnd = RecurrenceEnd.Never,
      startAt = startAt,
      zoneId = "UTC",
      createdAt = startAt,
      scheduleCalculator = com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator(),
    ).copy(generatedOccurrences = 1)

    val occurrences = AnalyticsScheduledOccurrenceProjector().project(
      movement,
      fromInclusive = startAt,
      toExclusive = startAt.plusSeconds(2 * 24 * 60 * 60),
    )

    assertThat(occurrences.map { it.effectiveAt }).containsExactly(
      startAt.plusSeconds(24 * 60 * 60),
    )
  }

  @Test
  fun `analytics fact id is separate from the posted transaction reference`() {
    val transactionId = "00000000-0000-4000-8000-000000000010"
    val fact = AnalyticsMovementFactAssembler().assemble(
      posted = listOf(AnalyticsPostedMovement(
        id = transactionId,
        effectiveAt = effectiveAt,
        accountId = "account",
        type = AnalyticsMovementType.EXPENSE,
        currency = currency,
        personalAmount = Money.of(BigDecimal("4.00"), "EUR"),
        fullAmount = Money.of(BigDecimal("4.00"), "EUR"),
      )),
      expected = emptyList(),
      scheduled = emptyList(),
      includePlannedMovements = false,
    ).single()

    assertThat(fact.analyticsFactId.value).isEqualTo("posted/$transactionId")
    assertThat(fact.reference).isEqualTo(AnalyticsMovementReference.Posted(transactionId))
  }

  @Test
  fun `analytics query includes from and excludes to`() {
    val from = effectiveAt
    val to = effectiveAt.plusSeconds(10)
    val query = AnalyticsMovementFactQuery(
      postedReader = object : AnalyticsPostedMovementReader {
        override fun read(window: AnalyticsMovementReadWindow) = listOf(
          AnalyticsPostedMovement("at-from", from, "account", AnalyticsMovementType.EXPENSE, currency, Money.of(BigDecimal("1.00"), "EUR"), Money.of(BigDecimal("1.00"), "EUR")),
          AnalyticsPostedMovement("at-to", to, "account", AnalyticsMovementType.EXPENSE, currency, Money.of(BigDecimal("2.00"), "EUR"), Money.of(BigDecimal("2.00"), "EUR")),
        )
      },
      expectedReader = object : AnalyticsExpectedMovementReader { override fun readPending(window: AnalyticsMovementReadWindow) = emptyList<AnalyticsExpectedMovement>() },
      scheduledReader = object : AnalyticsScheduledMovementReader { override fun read(window: AnalyticsMovementReadWindow) = emptyList<AnalyticsScheduledProjection>() },
    )

    val result = query.execute(AnalyticsMovementReadWindow(from, to), includePlannedMovements = false)

    assertThat(result.facts.map { it.identity.value }).containsExactly("posted/at-from")
  }

  private fun fact(
    identity: AnalyticsMovementIdentity,
    source: AnalyticsMovementSource,
    amount: String = "1.00",
  ) = AnalyticsMovementFact(
    identity = identity,
    source = source,
    effectiveAt = effectiveAt,
    accountId = "account",
    type = AnalyticsMovementType.EXPENSE,
    currency = currency,
    personalAmount = Money.of(BigDecimal(amount), "EUR"),
    fullAmount = Money.of(BigDecimal(amount), "EUR"),
    ignored = false,
    categoryId = null,
    tagIds = emptySet(),
  )
}
