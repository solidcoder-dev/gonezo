package com.gonezo.multiplatform.core

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.time.Instant
import java.util.UUID
import org.junit.Assert.assertEquals
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AndroidAnalyticsQueryCoreInstrumentedTest {
  private lateinit var context: Context
  private lateinit var ledger: AndroidLedgerCore
  private lateinit var accountId: String

  @Before
  fun setUp() {
    context = ApplicationProvider.getApplicationContext()
    ledger = AndroidLedgerCore.getInstance(context)
    accountId = ledger.openAccount("analytics-pagination-${UUID.randomUUID()}", "cash", "EUR", "2026-01-01T00:00:00Z", null).toString()
  }

  @After
  fun tearDown() {
    ledger.deleteAccount(accountId)
  }

  @Test
  fun analyticsReadsAllPostedMovementsBeyondTheUiPageSizeInStableHalfOpenRange() {
    repeat(150) { index ->
      ledger.recordExpense(
        accountId,
        "2026-06-15T${String.format("%02d", index / 60)}:${String.format("%02d", index % 60)}:00Z",
        "1.00",
        "EUR",
        "movement-$index",
        null,
        null,
      )
    }
    ledger.recordExpense(accountId, "2026-07-01T00:00:00Z", "1.00", "EUR", "exclusive-boundary", null, null)

    val result = AndroidAnalyticsQueryCore(context).query(
      Instant.parse("2026-06-01T00:00:00Z"),
      Instant.parse("2026-07-01T00:00:00Z"),
      false,
      false,
      "EUR",
      setOf(accountId),
    )

    assertEquals(150, result.facts.size)
    assertEquals(150, result.facts.map { it.analyticsFactId.value }.toSet().size)
    assertEquals(result.facts.sortedByDescending { it.effectiveAt }, result.facts)
  }
}
