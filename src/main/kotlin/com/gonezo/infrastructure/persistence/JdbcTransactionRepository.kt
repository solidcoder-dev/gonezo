package com.gonezo.infrastructure.persistence

import com.gonezo.domain.cashledger.Transaction
import com.gonezo.domain.cashledger.ports.TransactionRepository
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
class JdbcTransactionRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : TransactionRepository {

  override fun save(transaction: Transaction) {
    val sql = """
      insert into transactions (
        id, account_id, posted_date, effective_date, amount, currency, type, merchant, category_id, recurring
      ) values (
        :id, :account_id, :posted_date, :effective_date, :amount, :currency, :type, :merchant, :category_id, :recurring
      )
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", transaction.id)
      .addValue("account_id", transaction.accountId)
      .addValue("posted_date", transaction.postedDate)
      .addValue("effective_date", transaction.effectiveDate)
      .addValue("amount", transaction.amount.amount)
      .addValue("currency", transaction.amount.currency)
      .addValue("type", transaction.type)
      .addValue("merchant", transaction.merchant)
      .addValue("category_id", transaction.categoryId)
      .addValue("recurring", transaction.recurring)

    jdbcTemplate.update(sql, params)
  }

  override fun listByAccount(accountId: UUID): List<Transaction> {
    val sql = """
      select id, account_id, posted_date, effective_date, amount, currency, type, merchant, category_id, recurring
      from transactions
      where account_id = :account_id
    """.trimIndent()

    val params = MapSqlParameterSource("account_id", accountId)
    return jdbcTemplate.query(sql, params, transactionRowMapper())
  }

  private fun transactionRowMapper(): RowMapper<Transaction> = RowMapper { rs: ResultSet, _ ->
    Transaction(
      id = UUID.fromString(rs.getString("id")),
      accountId = UUID.fromString(rs.getString("account_id")),
      postedDate = rs.getObject("posted_date", LocalDate::class.java),
      effectiveDate = rs.getObject("effective_date", LocalDate::class.java),
      amount = Money(
        amount = rs.getObject("amount", BigDecimal::class.java),
        currency = rs.getString("currency"),
      ),
      type = rs.getString("type"),
      merchant = rs.getString("merchant"),
      categoryId = rs.getString("category_id")?.let(UUID::fromString),
      recurring = rs.getBoolean("recurring"),
    )
  }
}
