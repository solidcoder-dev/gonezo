package com.gonezo.infrastructure.persistence

import com.gonezo.domain.ledger.Account
import com.gonezo.domain.ledger.AccountId
import com.gonezo.domain.ledger.AccountStatus
import com.gonezo.domain.ledger.AccountType
import com.gonezo.domain.ledger.CurrencyCode
import com.gonezo.domain.ledger.ports.LedgerAccountRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcLedgerAccountRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : LedgerAccountRepository {
  override fun save(account: Account) {
    val sql = """
      insert into ledger_accounts (id, name, type, currency, status, created_at, archived_at)
      values (:id, :name, :type, :currency, :status, :created_at, :archived_at)
      on conflict(id) do update set
        name = excluded.name,
        type = excluded.type,
        currency = excluded.currency,
        status = excluded.status,
        created_at = excluded.created_at,
        archived_at = excluded.archived_at
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", account.id.toString())
      .addValue("name", account.name)
      .addValue("type", account.type.value)
      .addValue("currency", account.currency.value)
      .addValue("status", account.status.value)
      .addValue("created_at", account.createdAt.toString())
      .addValue("archived_at", account.archivedAt?.toString())

    jdbcTemplate.update(sql, params)
  }

  override fun findById(id: AccountId): Account? {
    val sql = """
      select id, name, type, currency, status, created_at, archived_at
      from ledger_accounts
      where id = :id
    """.trimIndent()
    val params = MapSqlParameterSource("id", id.toString())
    return jdbcTemplate.query(sql, params, accountRowMapper()).firstOrNull()
  }

  override fun exists(id: AccountId): Boolean {
    val sql = "select count(*) from ledger_accounts where id = :id"
    val count = jdbcTemplate.queryForObject(sql, MapSqlParameterSource("id", id.toString()), Int::class.java) ?: 0
    return count > 0
  }

  override fun listAll(): List<Account> {
    val sql = """
      select id, name, type, currency, status, created_at, archived_at
      from ledger_accounts
      order by name asc, id asc
    """.trimIndent()
    return jdbcTemplate.query(sql, accountRowMapper())
  }

  private fun accountRowMapper(): RowMapper<Account> = RowMapper { rs: ResultSet, _ ->
    Account(
      id = AccountId.from(rs.getString("id")),
      name = rs.getString("name"),
      type = AccountType.from(rs.getString("type")),
      currency = CurrencyCode.from(rs.getString("currency")),
      status = AccountStatus.from(rs.getString("status")),
      createdAt = Instant.parse(rs.getString("created_at")),
      archivedAt = rs.getString("archived_at")?.let(Instant::parse),
    )
  }
}
