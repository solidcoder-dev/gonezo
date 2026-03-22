package com.gonezo.infrastructure.persistence

import com.gonezo.domain.ledger.AccountId
import com.gonezo.domain.ledger.DateRange
import com.gonezo.domain.ledger.Transaction
import com.gonezo.domain.ledger.TransactionId
import com.gonezo.domain.ledger.TransactionItem
import com.gonezo.domain.ledger.TransactionItemId
import com.gonezo.domain.ledger.TransactionStatus
import com.gonezo.domain.ledger.TransactionType
import com.gonezo.domain.ledger.ports.LedgerTransactionRepository
import com.gonezo.domain.shared.Money
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcLedgerTransactionRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : LedgerTransactionRepository {
  override fun save(transaction: Transaction) {
    val upsertTransaction = """
      insert into ledger_transactions (
        id, account_id, type, amount, currency, occurred_at, description, merchant, status, linked_transaction_id
      ) values (
        :id, :account_id, :type, :amount, :currency, :occurred_at, :description, :merchant, :status, :linked_transaction_id
      )
      on conflict(id) do update set
        account_id = excluded.account_id,
        type = excluded.type,
        amount = excluded.amount,
        currency = excluded.currency,
        occurred_at = excluded.occurred_at,
        description = excluded.description,
        merchant = excluded.merchant,
        status = excluded.status,
        linked_transaction_id = excluded.linked_transaction_id
    """.trimIndent()

    val txParams = MapSqlParameterSource()
      .addValue("id", transaction.id.toString())
      .addValue("account_id", transaction.accountId.toString())
      .addValue("type", transaction.type.value)
      .addValue("amount", transaction.amount.amount)
      .addValue("currency", transaction.amount.currency)
      .addValue("occurred_at", transaction.occurredAt.toString())
      .addValue("description", transaction.description)
      .addValue("merchant", transaction.merchant)
      .addValue("status", transaction.status.value)
      .addValue("linked_transaction_id", transaction.linkedTransactionId?.toString())

    jdbcTemplate.update(upsertTransaction, txParams)

    val deleteItems = "delete from ledger_transaction_items where transaction_id = :transaction_id"
    jdbcTemplate.update(deleteItems, MapSqlParameterSource("transaction_id", transaction.id.toString()))

    val insertItem = """
      insert into ledger_transaction_items (
        id, transaction_id, name, amount, currency, note
      ) values (
        :id, :transaction_id, :name, :amount, :currency, :note
      )
    """.trimIndent()
    transaction.items.forEach { item ->
      val itemParams = MapSqlParameterSource()
        .addValue("id", item.id.toString())
        .addValue("transaction_id", transaction.id.toString())
        .addValue("name", item.name)
        .addValue("amount", item.amount.amount)
        .addValue("currency", item.amount.currency)
        .addValue("note", item.note)
      jdbcTemplate.update(insertItem, itemParams)
    }
  }

  override fun findById(id: TransactionId): Transaction? {
    val sql = """
      select id, account_id, type, amount, currency, occurred_at, description, merchant, status, linked_transaction_id
      from ledger_transactions
      where id = :id
    """.trimIndent()
    val params = MapSqlParameterSource("id", id.toString())
    return jdbcTemplate.query(sql, params, transactionRowMapper()).firstOrNull()?.let { hydrateItems(it) }
  }

  override fun findByAccount(accountId: AccountId, limit: Int?): List<Transaction> {
    val sql = buildString {
      append(
        """
      select id, account_id, type, amount, currency, occurred_at, description, merchant, status, linked_transaction_id
      from ledger_transactions
      where account_id = :account_id
      order by occurred_at desc, id desc
        """.trimIndent(),
      )
      if (limit != null && limit > 0) {
        append("\nlimit :limit")
      }
    }
    val params = MapSqlParameterSource("account_id", accountId.toString())
      .addValue("limit", limit)
    return jdbcTemplate.query(sql, params, transactionRowMapper()).map(::hydrateItems)
  }

  override fun findByAccountAndPeriod(accountId: AccountId, range: DateRange): List<Transaction> {
    val sql = """
      select id, account_id, type, amount, currency, occurred_at, description, merchant, status, linked_transaction_id
      from ledger_transactions
      where account_id = :account_id
        and occurred_at >= :from_date
        and occurred_at <= :to_date
      order by occurred_at desc, id desc
    """.trimIndent()
    val params = MapSqlParameterSource()
      .addValue("account_id", accountId.toString())
      .addValue("from_date", range.from.toString())
      .addValue("to_date", range.to.toString())
    return jdbcTemplate.query(sql, params, transactionRowMapper()).map(::hydrateItems)
  }

  override fun findByAccountAndMerchant(accountId: AccountId, merchant: String): List<Transaction> {
    val sql = """
      select id, account_id, type, amount, currency, occurred_at, description, merchant, status, linked_transaction_id
      from ledger_transactions
      where account_id = :account_id
        and lower(merchant) = lower(:merchant)
      order by occurred_at desc, id desc
    """.trimIndent()
    val params = MapSqlParameterSource()
      .addValue("account_id", accountId.toString())
      .addValue("merchant", merchant.trim())
    return jdbcTemplate.query(sql, params, transactionRowMapper()).map(::hydrateItems)
  }

  private fun hydrateItems(transaction: Transaction): Transaction {
    val sql = """
      select id, transaction_id, name, amount, currency, note
      from ledger_transaction_items
      where transaction_id = :transaction_id
      order by id asc
    """.trimIndent()
    val params = MapSqlParameterSource("transaction_id", transaction.id.toString())
    val items = jdbcTemplate.query(sql, params, itemRowMapper())
    return transaction.copy(items = items)
  }

  private fun transactionRowMapper(): RowMapper<Transaction> = RowMapper { rs: ResultSet, _ ->
    Transaction(
      id = TransactionId.from(rs.getString("id")),
      accountId = AccountId.from(rs.getString("account_id")),
      type = TransactionType.from(rs.getString("type")),
      amount = Money(
        amount = rs.getObject("amount", BigDecimal::class.java),
        currency = rs.getString("currency"),
      ),
      occurredAt = Instant.parse(rs.getString("occurred_at")),
      description = rs.getString("description"),
      merchant = rs.getString("merchant"),
      status = TransactionStatus.from(rs.getString("status")),
      items = emptyList(),
      linkedTransactionId = rs.getString("linked_transaction_id")?.let(TransactionId::from),
    )
  }

  private fun itemRowMapper(): RowMapper<TransactionItem> = RowMapper { rs: ResultSet, _ ->
    TransactionItem(
      id = TransactionItemId.from(rs.getString("id")),
      name = rs.getString("name"),
      amount = Money(
        amount = rs.getObject("amount", BigDecimal::class.java),
        currency = rs.getString("currency"),
      ),
      note = rs.getString("note"),
    )
  }
}
