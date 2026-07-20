package com.gonezo.multiplatform.core

import com.gonezo.application.query.NetWorthAccountRead
import com.gonezo.application.query.NetWorthByCurrencyReadData
import com.gonezo.application.query.NetWorthByCurrencyReadPort
import com.gonezo.application.query.NetWorthTransactionRead
import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.AccountId
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

internal class AndroidNetWorthByCurrencyReadAdapter(
  private val database: CoreDatabase,
) : NetWorthByCurrencyReadPort {
  override fun read(): NetWorthByCurrencyReadData {
    val accounts = linkedMapOf<AccountId, CurrencyCode>()
    val transactions = mutableListOf<NetWorthTransactionRead>()
    val cursor = database.readableDatabase.rawQuery(
      "select a.id, a.currency, t.type, t.status, t.amount, t.currency, t.occurred_at "
        + "from ledger_accounts a left join ledger_transactions t on t.account_id = a.id "
        + "order by a.id asc, t.occurred_at asc, t.id asc",
      null,
    )

    cursor.use {
      while (it.moveToNext()) {
        val accountId = AccountId(UUID.fromString(it.getString(0)))
        accounts[accountId] = CurrencyCode.from(it.getString(1))
        if (!it.isNull(2)) {
          transactions += NetWorthTransactionRead(
            accountId = accountId,
            type = it.getString(2),
            status = it.getString(3),
            amount = Money(BigDecimal(it.getString(4)), it.getString(5)),
            occurredAt = Instant.parse(it.getString(6)),
          )
        }
      }
    }

    return NetWorthByCurrencyReadData(
      accounts = accounts.map { (id, currency) -> NetWorthAccountRead(id, currency) },
      transactions = transactions,
    )
  }
}
