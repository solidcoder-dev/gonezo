package com.gonezo.infrastructure.persistence

import com.gonezo.domain.investments.InvestmentTransaction
import com.gonezo.domain.investments.InvestmentTransactionType
import com.gonezo.domain.investments.ports.InvestmentTransactionRepository
import com.gonezo.domain.shared.Money
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.time.LocalDate
import java.util.UUID

@Repository
class JdbcInvestmentTransactionRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : InvestmentTransactionRepository {

  override fun save(transaction: InvestmentTransaction) {
    val sql = """
      insert into investment_transactions (
        id, container_id, date, type, asset_id, quantity,
        amount, currency, fees_amount, fees_currency, taxes_amount, taxes_currency, note
      ) values (
        :id, :container_id, :date, :type, :asset_id, :quantity,
        :amount, :currency, :fees_amount, :fees_currency, :taxes_amount, :taxes_currency, :note
      )
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", transaction.id)
      .addValue("container_id", transaction.containerId)
      .addValue("date", transaction.date)
      .addValue("type", transaction.type.value)
      .addValue("asset_id", transaction.assetId)
      .addValue("quantity", transaction.quantity)
      .addValue("amount", transaction.amount.amount)
      .addValue("currency", transaction.amount.currency)
      .addValue("fees_amount", transaction.fees?.amount)
      .addValue("fees_currency", transaction.fees?.currency)
      .addValue("taxes_amount", transaction.taxes?.amount)
      .addValue("taxes_currency", transaction.taxes?.currency)
      .addValue("note", transaction.note)

    jdbcTemplate.update(sql, params)
  }

  override fun listByContainer(containerId: UUID): List<InvestmentTransaction> {
    val sql = """
      select id, container_id, date, type, asset_id, quantity,
        amount, currency, fees_amount, fees_currency, taxes_amount, taxes_currency, note
      from investment_transactions
      where container_id = :container_id
    """.trimIndent()

    val params = MapSqlParameterSource("container_id", containerId)
    return jdbcTemplate.query(sql, params, transactionRowMapper())
  }

  private fun transactionRowMapper(): RowMapper<InvestmentTransaction> = RowMapper { rs: ResultSet, _ ->
    val feesAmount = rs.getObject("fees_amount", BigDecimal::class.java)
    val feesCurrency = rs.getString("fees_currency")
    val taxesAmount = rs.getObject("taxes_amount", BigDecimal::class.java)
    val taxesCurrency = rs.getString("taxes_currency")

    InvestmentTransaction(
      id = UUID.fromString(rs.getString("id")),
      containerId = UUID.fromString(rs.getString("container_id")),
      date = rs.getObject("date", LocalDate::class.java),
      type = InvestmentTransactionType.from(rs.getString("type")),
      assetId = rs.getString("asset_id")?.let(UUID::fromString),
      quantity = rs.getObject("quantity", BigDecimal::class.java),
      amount = Money(
        amount = rs.getObject("amount", BigDecimal::class.java),
        currency = rs.getString("currency"),
      ),
      fees = if (feesAmount != null && feesCurrency != null) Money(feesAmount, feesCurrency) else null,
      taxes = if (taxesAmount != null && taxesCurrency != null) Money(taxesAmount, taxesCurrency) else null,
      note = rs.getString("note"),
    )
  }
}
