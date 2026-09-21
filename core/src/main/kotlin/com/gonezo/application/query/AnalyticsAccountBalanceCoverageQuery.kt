package com.gonezo.application.query

import com.gonezo.ledger.domain.Account
import java.time.ZoneId

data class AnalyticsAccountBalanceCoverageResult(val firstAccountLocalDate: String?)

class AnalyticsAccountBalanceCoverageQuery {
    fun execute(accounts: Iterable<Account>, zoneId: String): AnalyticsAccountBalanceCoverageResult {
        val firstDate = accounts.asSequence()
            .map { it.createdAt.atZone(ZoneId.of(zoneId)).toLocalDate() }
            .minOrNull()
            ?.toString()
        return AnalyticsAccountBalanceCoverageResult(firstDate)
    }
}
