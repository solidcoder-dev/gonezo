package com.gonezo.presentation

import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class GetBudgetLinksE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/get_budget_links_setup.sql")

  @Test
  fun `returns budget links for period`() {
    val rows = db.jdbcTemplate.queryForList(
      "select id, budget_period_id, budget_impact_amount from budget_links",
    )

    assertThat(rows).hasSize(1)
    val row = rows.first()
    assertThat(row["id"].toString()).isEqualTo("11111111-2222-3333-4444-555555555555")
    assertThat(row["budget_period_id"].toString()).isEqualTo("dddddddd-dddd-dddd-dddd-dddddddddddd")
    assertThat(com.gonezo.testing.decimal(row["budget_impact_amount"])).isEqualByComparingTo(BigDecimal("102.00"))
  }
}
