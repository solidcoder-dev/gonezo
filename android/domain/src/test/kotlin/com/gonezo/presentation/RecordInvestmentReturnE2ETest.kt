package com.gonezo.presentation

import com.gonezo.application.RecordInvestmentReturnCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class RecordInvestmentReturnE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/record_investment_return_setup.sql")

  @Test
  fun `records investment return`() {
    val command = RecordInvestmentReturnCommand(
      containerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      date = LocalDate.of(2026, 2, 3),
      amount = Money(BigDecimal("12.34"), "USD"),
      note = "dividend",
    )

    val investmentId = app.recordInvestmentReturnUC.execute(command)

    val row = db.jdbcTemplate.queryForMap(
      "select id, container_id, date, type, amount, currency, note from investment_transactions where id = ?",
      investmentId.toString(),
    )

    assertThat(row["id"].toString()).isEqualTo(investmentId.toString())
    assertThat(row["container_id"].toString()).isEqualTo(command.containerId.toString())
    assertThat(row["date"].toString()).isEqualTo(command.date.toString())
    assertThat(row["type"]).isEqualTo("dividend")
    assertThat(row["amount"] as BigDecimal).isEqualByComparingTo(command.amount.amount)
    assertThat(row["currency"]).isEqualTo("USD")
    assertThat(row["note"]).isEqualTo(command.note)
  }
}
