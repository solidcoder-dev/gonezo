package com.gonezo.application.query

import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.services.BalanceCalculator
import java.time.LocalDate
import java.time.ZoneId

data class AnalyticsAccountBalanceSnapshotInput(
    val asOfLocalDateExclusive: String,
    val zoneId: String,
    val currency: String? = null,
)

data class AnalyticsAccountBalanceSnapshotItem(
    val accountId: String,
    val accountType: String,
    val currency: String,
    val balanceAmount: String,
)

data class AnalyticsAccountBalanceSnapshotResult(
    val asOfLocalDateExclusive: String,
    val zoneId: String,
    val items: List<AnalyticsAccountBalanceSnapshotItem>,
)

class AnalyticsAccountBalanceSnapshotQuery(
    private val balanceCalculator: BalanceCalculator = BalanceCalculator(),
) {
    fun execute(
        accounts: Iterable<Account>,
        transactions: Iterable<Transaction>,
        input: AnalyticsAccountBalanceSnapshotInput,
    ): AnalyticsAccountBalanceSnapshotResult {
        require(Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(input.asOfLocalDateExclusive)) {
            "asOfLocalDateExclusive must use YYYY-MM-DD"
        }
        val cutoff = LocalDate.parse(input.asOfLocalDateExclusive).atStartOfDay(ZoneId.of(input.zoneId)).toInstant()
        val normalizedCurrency = input.currency?.trim()?.uppercase()
        val transactionsByAccount = transactions.asSequence()
            .filter { it.status.value.equals("posted", ignoreCase = true) && it.occurredAt.isBefore(cutoff) }
            .groupBy { it.accountId }
        val items = accounts.asSequence()
            .filter { it.createdAt.isBefore(cutoff) }
            .filter { normalizedCurrency == null || it.currency.value == normalizedCurrency }
            .map { account ->
                val balance = balanceCalculator.calculate(
                    account.currency.value,
                    transactionsByAccount[account.id].orEmpty(),
                )
                AnalyticsAccountBalanceSnapshotItem(
                    accountId = account.id.toString(),
                    accountType = account.type.value,
                    currency = account.currency.value,
                    balanceAmount = balance.amount.toPlainString(),
                )
            }
            .sortedWith(compareBy<AnalyticsAccountBalanceSnapshotItem> { it.currency }.thenBy { it.accountType }.thenBy { it.accountId })
            .toList()
        return AnalyticsAccountBalanceSnapshotResult(input.asOfLocalDateExclusive, input.zoneId, items)
    }
}
