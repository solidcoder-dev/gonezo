package com.gonezo.multiplatform.core

import com.gonezo.application.query.AnalyticsAccountBalanceSnapshotInput
import com.gonezo.application.query.AnalyticsAccountBalanceSnapshotQuery
import com.gonezo.application.query.AnalyticsAccountBalanceSnapshotResult

class AndroidAnalyticsAccountBalanceQuery(context: android.content.Context) {
    private val database = CoreDatabase(context.applicationContext)
    private val accounts = AndroidLedgerAccountRepository(database)
    private val transactions = AndroidLedgerTransactionRepository(database)

    fun query(input: AnalyticsAccountBalanceSnapshotInput): AnalyticsAccountBalanceSnapshotResult =
        AnalyticsAccountBalanceSnapshotQuery().execute(accounts.listAll(), transactions.listAll(), input)
}
