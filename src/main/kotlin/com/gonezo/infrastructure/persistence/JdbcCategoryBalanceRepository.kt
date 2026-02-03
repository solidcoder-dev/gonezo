package com.gonezo.infrastructure.persistence

import com.gonezo.domain.budgeting.CategoryBalance
import com.gonezo.domain.budgeting.ports.CategoryBalanceRepository
import com.gonezo.domain.shared.Money
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcCategoryBalanceRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : CategoryBalanceRepository {

  override fun save(balance: CategoryBalance) {
    val sql = """
      insert into category_balances (
        id, budget_period_id, category_id,
        opening_balance_amount, opening_balance_currency,
        allocated_amount, allocated_currency,
        spent_amount, spent_currency,
        available_amount, available_currency,
        reserved_amount, reserved_currency,
        safe_to_spend_amount, safe_to_spend_currency
      ) values (
        :id, :budget_period_id, :category_id,
        :opening_balance_amount, :opening_balance_currency,
        :allocated_amount, :allocated_currency,
        :spent_amount, :spent_currency,
        :available_amount, :available_currency,
        :reserved_amount, :reserved_currency,
        :safe_to_spend_amount, :safe_to_spend_currency
      )
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", balance.id)
      .addValue("budget_period_id", balance.budgetPeriodId)
      .addValue("category_id", balance.categoryId)
      .addValue("opening_balance_amount", balance.openingBalance.amount)
      .addValue("opening_balance_currency", balance.openingBalance.currency)
      .addValue("allocated_amount", balance.allocated.amount)
      .addValue("allocated_currency", balance.allocated.currency)
      .addValue("spent_amount", balance.spent.amount)
      .addValue("spent_currency", balance.spent.currency)
      .addValue("available_amount", balance.available.amount)
      .addValue("available_currency", balance.available.currency)
      .addValue("reserved_amount", balance.reserved.amount)
      .addValue("reserved_currency", balance.reserved.currency)
      .addValue("safe_to_spend_amount", balance.safeToSpend.amount)
      .addValue("safe_to_spend_currency", balance.safeToSpend.currency)

    jdbcTemplate.update(sql, params)
  }

  override fun listByPeriod(periodId: UUID): List<CategoryBalance> {
    val sql = """
      select id, budget_period_id, category_id,
        opening_balance_amount, opening_balance_currency,
        allocated_amount, allocated_currency,
        spent_amount, spent_currency,
        available_amount, available_currency,
        reserved_amount, reserved_currency,
        safe_to_spend_amount, safe_to_spend_currency
      from category_balances
      where budget_period_id = :period_id
    """.trimIndent()

    val params = MapSqlParameterSource("period_id", periodId)
    return jdbcTemplate.query(sql, params, balanceRowMapper())
  }

  private fun balanceRowMapper(): RowMapper<CategoryBalance> = RowMapper { rs: ResultSet, _ ->
    CategoryBalance(
      id = UUID.fromString(rs.getString("id")),
      budgetPeriodId = UUID.fromString(rs.getString("budget_period_id")),
      categoryId = UUID.fromString(rs.getString("category_id")),
      openingBalance = moneyFrom(rs, "opening_balance"),
      allocated = moneyFrom(rs, "allocated"),
      spent = moneyFrom(rs, "spent"),
      available = moneyFrom(rs, "available"),
      reserved = moneyFrom(rs, "reserved"),
      safeToSpend = moneyFrom(rs, "safe_to_spend"),
    )
  }

  private fun moneyFrom(rs: ResultSet, prefix: String): Money {
    val amount = rs.getObject("${prefix}_amount", BigDecimal::class.java)
    val currency = rs.getString("${prefix}_currency")
    return Money(amount, currency)
  }
}
