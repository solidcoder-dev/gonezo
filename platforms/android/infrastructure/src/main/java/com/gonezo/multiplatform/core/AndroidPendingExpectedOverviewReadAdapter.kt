package com.gonezo.multiplatform.core

import com.gonezo.application.query.PendingExpectedMovementRead
import com.gonezo.application.query.PendingExpectedOverviewReadPort
import java.math.BigDecimal

internal class AndroidPendingExpectedOverviewReadAdapter(private val database: CoreDatabase) : PendingExpectedOverviewReadPort {
  override fun read(): List<PendingExpectedMovementRead> {
    val cursor = database.readableDatabase.rawQuery(
      "select em.movement_type, em.currency, em.amount from expected_movements em " +
        "inner join ledger_accounts a on a.id = em.account_id " +
        "where em.status = ? and a.status = ? and em.movement_type in (?, ?) order by em.id asc",
      arrayOf("pending", "active", "expense", "income"),
    )
    return cursor.use {
      buildList {
        while (it.moveToNext()) add(PendingExpectedMovementRead(it.getString(0), it.getString(1), BigDecimal(it.getString(2)).toPlainString()))
      }
    }
  }
}
