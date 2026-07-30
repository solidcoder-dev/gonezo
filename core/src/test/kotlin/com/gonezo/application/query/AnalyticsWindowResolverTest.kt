package com.gonezo.application.query

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class AnalyticsWindowResolverTest {
    private val zone = ZoneId.of("Europe/Madrid")
    private val clock = Clock.fixed(Instant.parse("2026-07-24T12:00:00Z"), zone)
    private val resolver = AnalyticsWindowResolver(clock, zone)

    @Test
    fun `planned this month is the complete natural month and includes the last day`() {
        val windows = resolver.resolve(AnalyticsPeriodSelection(AnalyticsPeriodKind.THIS_MONTH), true)

        assertThat(windows.current).isNotNull
        assertThat(windows.current!!.fromInclusive).isEqualTo(Instant.parse("2026-06-30T22:00:00Z"))
        assertThat(windows.current.toExclusive).isEqualTo(Instant.parse("2026-07-31T22:00:00Z"))
        assertThat(windows.current.contains(Instant.parse("2026-07-29T05:41:00Z"))).isTrue()
        assertThat(windows.comparison!!.fromInclusive).isEqualTo(Instant.parse("2026-05-31T22:00:00Z"))
        assertThat(windows.comparison.toExclusive).isEqualTo(Instant.parse("2026-06-30T22:00:00Z"))
    }

    @Test
    fun `planned disabled preserves month to date and previous equivalent length`() {
        val windows = resolver.resolve(AnalyticsPeriodSelection(AnalyticsPeriodKind.THIS_MONTH), false)

        assertThat(windows.current!!.toExclusive).isEqualTo(Instant.parse("2026-07-24T22:00:00Z"))
        assertThat(windows.comparison!!.fromInclusive).isEqualTo(Instant.parse("2026-05-31T22:00:00Z"))
        assertThat(windows.comparison.toExclusive).isEqualTo(Instant.parse("2026-06-24T22:00:00Z"))
    }

    @Test
    fun `custom ranges are exact and DST uses the injected zone`() {
        val windows =
            resolver.resolve(
                AnalyticsPeriodSelection(
                    kind = AnalyticsPeriodKind.CUSTOM,
                    from = LocalDate.of(2026, 10, 24),
                    to = LocalDate.of(2026, 10, 26),
                ),
                true,
            )

        assertThat(windows.current!!.fromInclusive).isEqualTo(Instant.parse("2026-10-23T22:00:00Z"))
        assertThat(windows.current.toExclusive).isEqualTo(Instant.parse("2026-10-26T23:00:00Z"))
    }

    @Test
    fun `july local month starts before UTC midnight and excludes august boundary`() {
        val windows = resolver.resolve(AnalyticsPeriodSelection(AnalyticsPeriodKind.THIS_MONTH), true)
        val current = windows.current!!

        assertThat(current.fromInclusive).isEqualTo(Instant.parse("2026-06-30T22:00:00Z"))
        assertThat(current.contains(Instant.parse("2026-06-30T21:59:59.999Z"))).isFalse()
        assertThat(current.contains(current.fromInclusive)).isTrue()
        assertThat(current.contains(current.toExclusive.minusNanos(1))).isTrue()
        assertThat(current.contains(current.toExclusive)).isFalse()
    }

    @Test
    fun `winter and summer days use zone starts rather than twenty four hour arithmetic`() {
        val summer =
            AnalyticsWindowResolver(clock, zone)
                .resolve(
                    AnalyticsPeriodSelection(AnalyticsPeriodKind.CUSTOM, LocalDate.of(2026, 3, 29), LocalDate.of(2026, 3, 29)),
                    true,
                ).current!!
        val winter =
            AnalyticsWindowResolver(clock, zone)
                .resolve(
                    AnalyticsPeriodSelection(AnalyticsPeriodKind.CUSTOM, LocalDate.of(2026, 10, 25), LocalDate.of(2026, 10, 25)),
                    true,
                ).current!!

        assertThat(Duration.between(summer.fromInclusive, summer.toExclusive).toHours()).isEqualTo(23)
        assertThat(Duration.between(winter.fromInclusive, winter.toExclusive).toHours()).isEqualTo(25)
    }
}
