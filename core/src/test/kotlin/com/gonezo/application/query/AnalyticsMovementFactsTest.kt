package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import com.gonezo.recurrence.domain.SchedulingKind
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

class AnalyticsMovementFactsTest {
    private val effectiveAt = Instant.parse("2026-01-01T00:00:00Z")
    private val currency = CurrencyCode.from("EUR")

    @Test
    fun `sharing summary is privacy safe and enforces settlement totals`() {
        val summary = AnalyticsSharingSummary(
            participantCount = 2,
            settlementParticipantCount = 1,
            participantAllocatedAmount = Money.of(BigDecimal("40.00"), "EUR"),
            settlementRequiredAmount = Money.of(BigDecimal("30.00"), "EUR"),
        )

        assertThat(summary.participantAllocatedAmount.amount).isEqualByComparingTo("40.00")
        org.assertj.core.api.Assertions.assertThatThrownBy {
            AnalyticsSharingSummary(1, 1, Money.of(BigDecimal("10"), "EUR"), Money.of(BigDecimal("11"), "EUR"))
        }.isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `category allocations reconcile split remainder and personal amounts exactly`() {
        val allocations = AnalyticsCategoryAllocationResolver.resolve(
            categoryId = "movement-category",
            personalAmount = Money.of(BigDecimal("0.05"), "EUR"),
            fullAmount = Money.of(BigDecimal("0.10"), "EUR"),
            splitAmounts = listOf(
                AnalyticsCategoryAmount("food", BigDecimal("0.03")),
                AnalyticsCategoryAmount("home", BigDecimal("0.02")),
            ),
        )

        assertThat(allocations.map { it.categoryId }).containsExactly("food", "home", null)
        assertThat(allocations.fold(BigDecimal.ZERO) { total, item -> total + item.fullAmount.amount }).isEqualByComparingTo("0.10")
        assertThat(allocations.fold(BigDecimal.ZERO) { total, item -> total + item.personalAmount.amount }).isEqualByComparingTo("0.05")
    }

    @Test
    fun `category allocation resolver rejects split overage`() {
        org.assertj.core.api.Assertions.assertThatThrownBy {
            AnalyticsCategoryAllocationResolver.resolve(
                null, Money.of(BigDecimal("1.00"), "EUR"), Money.of(BigDecimal("1.00"), "EUR"),
                listOf(AnalyticsCategoryAmount("food", BigDecimal("1.01"))),
            )
        }.hasMessage("split allocation total exceeds movement amount")
    }

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
            identity = AnalyticsMovementIdentity.scheduled("series", 1),
            effectiveAt = effectiveAt,
            accountId = "account",
            type = AnalyticsMovementType.INCOME,
            currency = currency,
            personalAmount = expected.personalAmount,
            fullAmount = expected.fullAmount,
            originOccurrenceId = occurrenceId,
        )

        val facts = AnalyticsMovementFactAssembler().assemble(emptyList(), listOf(expected), listOf(scheduled), true)

        val fact = facts.single()
        assertThat(fact.identity).isEqualTo(AnalyticsMovementIdentity.occurrence(occurrenceId))
        assertThat(fact.source).isEqualTo(AnalyticsMovementSource.EXPECTED)
    }

    @Test
    fun `analytics references characterize scheduled expected posted and manual lineage`() {
        val occurrenceId = "occurrence-lineage"
        val recurringMovementId = "recurring-lineage"
        val expected = AnalyticsExpectedMovement(
            id = "expected-lineage", effectiveAt = effectiveAt, accountId = "account",
            type = AnalyticsMovementType.EXPENSE, currency = currency,
            personalAmount = Money.of(BigDecimal("10.00"), "EUR"),
            fullAmount = Money.of(BigDecimal("10.00"), "EUR"), pending = true,
            originOccurrenceId = occurrenceId, originRecurringMovementId = recurringMovementId,
        )
        val scheduled = AnalyticsScheduledProjection(
            identity = AnalyticsMovementIdentity.occurrence(occurrenceId), effectiveAt = effectiveAt,
            accountId = "account", type = AnalyticsMovementType.EXPENSE, currency = currency,
            personalAmount = expected.personalAmount, fullAmount = expected.fullAmount,
            originOccurrenceId = occurrenceId, recurringMovementId = recurringMovementId,
        )
        val posted = AnalyticsPostedMovement(
            id = "transaction-lineage", effectiveAt = effectiveAt, accountId = "account",
            type = AnalyticsMovementType.EXPENSE, currency = currency,
            personalAmount = expected.personalAmount, fullAmount = expected.fullAmount,
            occurrenceIdentity = AnalyticsMovementIdentity.occurrence(occurrenceId),
        )
        val manualExpected = expected.copy(
            id = "manual-expected", originOccurrenceId = null, originRecurringMovementId = null,
        )
        val facts = AnalyticsMovementFactAssembler().assemble(
            listOf(posted), listOf(expected, manualExpected), listOf(scheduled), true,
        )

        assertThat(facts).hasSize(2)
        assertThat(facts.single { it.source == AnalyticsMovementSource.POSTED }.identity)
            .isEqualTo(AnalyticsMovementIdentity.occurrence(occurrenceId))
        assertThat(facts.single { it.source == AnalyticsMovementSource.POSTED }.reference)
            .isEqualTo(AnalyticsMovementReference.Posted("transaction-lineage"))
        assertThat(facts.single { it.identity == AnalyticsMovementIdentity.occurrence(occurrenceId) }.source)
            .isEqualTo(AnalyticsMovementSource.POSTED)
        assertThat(facts.single { it.identity == AnalyticsMovementIdentity.expected("manual-expected", null, null) }.reference)
            .isEqualTo(AnalyticsMovementReference.Expected("manual-expected", null, null))
    }

    @Test
    fun `one occurrence identity replaces scheduled expected with posted`() {
        val occurrenceId = "occurrence-transition"
        val movement = AnalyticsExpectedMovement(
            id = "expected-transition", effectiveAt = effectiveAt, accountId = "account",
            type = AnalyticsMovementType.EXPENSE, currency = currency,
            personalAmount = Money.of(BigDecimal("10.00"), "EUR"),
            fullAmount = Money.of(BigDecimal("10.00"), "EUR"), pending = true,
            originOccurrenceId = occurrenceId, originRecurringMovementId = "recurring-transition",
        )
        val scheduled = AnalyticsScheduledProjection(
            identity = AnalyticsMovementIdentity.occurrence(occurrenceId), effectiveAt = effectiveAt,
            accountId = "account", type = movement.type, currency = currency,
            personalAmount = movement.personalAmount, fullAmount = movement.fullAmount,
            originOccurrenceId = occurrenceId, recurringMovementId = "recurring-transition",
        )
        val posted = AnalyticsPostedMovement(
            id = "transaction-transition", effectiveAt = effectiveAt, accountId = "account",
            type = movement.type, currency = currency, personalAmount = movement.personalAmount,
            fullAmount = movement.fullAmount, occurrenceIdentity = AnalyticsMovementIdentity.occurrence(occurrenceId),
        )
        val assembler = AnalyticsMovementFactAssembler()

        assertThat(assembler.assemble(emptyList(), listOf(movement), listOf(scheduled), true))
            .singleElement().extracting(AnalyticsMovementFact::source).isEqualTo(AnalyticsMovementSource.EXPECTED)
        assertThat(assembler.assemble(listOf(posted), listOf(movement.copy(pending = false)), listOf(scheduled), true))
            .singleElement().extracting(AnalyticsMovementFact::source).isEqualTo(AnalyticsMovementSource.POSTED)
    }

    @Test
    fun `assembler carries recurring and one shot origins without guessing manual movements`() {
        val recurringOrigin = AnalyticsSchedulingOrigin(SchedulingKind.RECURRING, "series-1", "occurrence-1")
        val oneShotOrigin = AnalyticsSchedulingOrigin(SchedulingKind.ONE_SHOT, "series-2", "occurrence-2")
        val recurringExpected = AnalyticsExpectedMovement(
            id = "expected-recurring", effectiveAt = effectiveAt, accountId = "account",
            type = AnalyticsMovementType.EXPENSE, currency = currency,
            personalAmount = Money.of(BigDecimal("10.00"), "EUR"),
            fullAmount = Money.of(BigDecimal("10.00"), "EUR"), pending = true,
            originOccurrenceId = "occurrence-1", originRecurringMovementId = "series-1",
            schedulingOrigin = recurringOrigin,
        )
        val manualExpected = recurringExpected.copy(
            id = "expected-manual", originOccurrenceId = null,
            originRecurringMovementId = null, schedulingOrigin = null,
        )
        val posted = AnalyticsPostedMovement(
            id = "posted-manual", effectiveAt = effectiveAt, accountId = "account",
            type = AnalyticsMovementType.EXPENSE, currency = currency,
            personalAmount = recurringExpected.personalAmount, fullAmount = recurringExpected.fullAmount,
        )
        val scheduled = AnalyticsScheduledProjection(
            identity = AnalyticsMovementIdentity.occurrence("occurrence-2"), effectiveAt = effectiveAt,
            accountId = "account", type = AnalyticsMovementType.EXPENSE, currency = currency,
            personalAmount = recurringExpected.personalAmount, fullAmount = recurringExpected.fullAmount,
            originOccurrenceId = "occurrence-2", recurringMovementId = "series-2", schedulingOrigin = oneShotOrigin,
        )

        val facts = AnalyticsMovementFactAssembler().assemble(
            listOf(posted), listOf(recurringExpected, manualExpected), listOf(scheduled), true,
        )

        assertThat(facts.single { it.identity == AnalyticsMovementIdentity.occurrence("occurrence-1") }.schedulingOrigin)
            .isEqualTo(recurringOrigin)
        assertThat(facts.single { it.identity == AnalyticsMovementIdentity.occurrence("occurrence-2") }.schedulingOrigin)
            .isEqualTo(oneShotOrigin)
        assertThat(facts.single { it.identity == AnalyticsMovementIdentity.expected("expected-manual", null, null) }.schedulingOrigin)
            .isNull()
        assertThat(facts.single { it.identity == AnalyticsMovementIdentity.posted("posted-manual") }.schedulingOrigin)
            .isNull()
    }

    @Test
    fun `query reads all three sources and planned false is posted only`() {
        val expected = AnalyticsExpectedMovement(
            id = "expected-1",
            effectiveAt = effectiveAt,
            accountId = "account",
            type = AnalyticsMovementType.INCOME,
            currency = currency,
            personalAmount = Money.of(BigDecimal("2045.96"), "EUR"),
            fullAmount = Money.of(BigDecimal("2045.96"), "EUR"),
            pending = true,
        )
        val posted = AnalyticsPostedMovement(
            id = "posted-1",
            effectiveAt = effectiveAt,
            accountId = "account",
            type = AnalyticsMovementType.INCOME,
            currency = currency,
            personalAmount = Money.of(BigDecimal("10.00"), "EUR"),
            fullAmount = Money.of(BigDecimal("10.00"), "EUR"),
        )
        var reads = 0
        val query = AnalyticsMovementFactQuery(
            postedReader = object : AnalyticsPostedMovementReader {
                override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsPostedMovement> {
                    reads++
                    return listOf(posted)
                }
            },
            expectedReader = object : AnalyticsExpectedMovementReader {
                override fun readPending(window: AnalyticsMovementReadWindow): Iterable<AnalyticsExpectedMovement> {
                    reads++
                    return listOf(expected)
                }
            },
            scheduledReader = object : AnalyticsScheduledMovementReader {
                override fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsScheduledProjection> {
                    reads++
                    return emptyList()
                }
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
            effectiveAt = expected.effectiveAt,
            accountId = "account",
            type = expected.type,
            currency = currency,
            personalAmount = amount,
            fullAmount = amount,
            originOccurrenceId = occurrenceId,
        )
        val query = AnalyticsMovementFactQuery(
            postedReader = object : AnalyticsPostedMovementReader {
                override fun read(window: AnalyticsMovementReadWindow) = emptyList<AnalyticsPostedMovement>()
            },
            expectedReader = object : AnalyticsExpectedMovementReader {
                override fun readPending(window: AnalyticsMovementReadWindow) = listOf(expected)
            },
            scheduledReader = object : AnalyticsScheduledMovementReader {
                override fun read(window: AnalyticsMovementReadWindow) = listOf(scheduled)
            },
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
        assertThat(
            service.query(
                posted = listOf(fact),
                expected = emptyList(),
                scheduled = emptyList(),
                filters = AnalyticsMovementQueryFilters(tagIds = setOf("travel")),
            ),
        ).isEmpty()
        assertThat(
            service.query(
                posted = listOf(fact),
                expected = emptyList(),
                scheduled = emptyList(),
                filters = AnalyticsMovementQueryFilters(tagIds = setOf("food"), includeIgnoredMovements = true),
            ),
        ).hasSize(1)
    }

    @Test
    fun `ignored is resolved from typed references before filtering and posted does not reveal expected`() {
        val posted = AnalyticsPostedMovement(
            id = "same-transaction",
            effectiveAt = effectiveAt,
            accountId = "account",
            type = AnalyticsMovementType.EXPENSE,
            currency = currency,
            personalAmount = Money.of(BigDecimal("100.00"), "EUR"),
            fullAmount = Money.of(BigDecimal("100.00"), "EUR"),
            occurrenceIdentity = AnalyticsMovementIdentity.occurrence("same-occurrence"),
        )
        val expected = AnalyticsExpectedMovement(
            id = "expected-1", effectiveAt = effectiveAt, accountId = "account",
            type = AnalyticsMovementType.EXPENSE, currency = currency,
            personalAmount = Money.of(BigDecimal("100.00"), "EUR"),
            fullAmount = Money.of(BigDecimal("100.00"), "EUR"), pending = true, originOccurrenceId = "same-occurrence",
        )
        var readerCalls = 0
        val reader = AnalyticsExclusionReader { references ->
            readerCalls += 1
            assertThat(references).containsExactly(
                AnalyticsMovementReference.Posted("same-transaction"),
                AnalyticsMovementReference.Expected("expected-1", null, "same-occurrence"),
            )
            setOf(AnalyticsExclusionKey("movement", "same-transaction"))
        }
        val service = AnalyticsMovementFactQueryService(exclusionReader = reader)

        val excluded = service.query(listOf(posted), listOf(expected), emptyList())
        val included = service.query(
            listOf(posted),
            listOf(expected),
            emptyList(),
            filters = AnalyticsMovementQueryFilters(includeIgnoredMovements = true),
        )

        assertThat(readerCalls).isEqualTo(2)
        assertThat(excluded).isEmpty()
        assertThat(included).hasSize(1)
        assertThat(included.single().source).isEqualTo(AnalyticsMovementSource.POSTED)
        assertThat(included.single().ignored).isTrue()
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
            posted = listOf(
                AnalyticsPostedMovement(
                    id = transactionId,
                    effectiveAt = effectiveAt,
                    accountId = "account",
                    type = AnalyticsMovementType.EXPENSE,
                    currency = currency,
                    personalAmount = Money.of(BigDecimal("4.00"), "EUR"),
                    fullAmount = Money.of(BigDecimal("4.00"), "EUR"),
                ),
            ),
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
            expectedReader = object : AnalyticsExpectedMovementReader {
                override fun readPending(window: AnalyticsMovementReadWindow) = emptyList<AnalyticsExpectedMovement>()
            },
            scheduledReader = object : AnalyticsScheduledMovementReader {
                override fun read(window: AnalyticsMovementReadWindow) = emptyList<AnalyticsScheduledProjection>()
            },
        )

        val result = query.execute(AnalyticsMovementReadWindow(from, to), includePlannedMovements = false)

        assertThat(result.facts.map { it.identity.value }).containsExactly("posted/at-from")
    }

    private fun fact(identity: AnalyticsMovementIdentity, source: AnalyticsMovementSource, amount: String = "1.00") = AnalyticsMovementFact(
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
