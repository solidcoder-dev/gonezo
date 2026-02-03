package com.gonezo.infrastructure.persistence

import com.gonezo.domain.cashledger.Account
import com.gonezo.domain.cashledger.ports.AccountRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcAccountRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : AccountRepository {

  override fun get(id: UUID): Account {
    val sql = """
      select id, user_id, name, type, currency
      from accounts
      where id = :id
    """.trimIndent()

    val params = MapSqlParameterSource("id", id)
    return jdbcTemplate.queryForObject(sql, params, accountRowMapper())!!
  }

  override fun save(account: Account) {
    val sql = """
      insert into accounts (id, user_id, name, type, currency)
      values (:id, :user_id, :name, :type, :currency)
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", account.id)
      .addValue("user_id", account.userId)
      .addValue("name", account.name)
      .addValue("type", account.type)
      .addValue("currency", account.currency)

    jdbcTemplate.update(sql, params)
  }

  private fun accountRowMapper(): RowMapper<Account> = RowMapper { rs: ResultSet, _ ->
    Account(
      id = UUID.fromString(rs.getString("id")),
      userId = UUID.fromString(rs.getString("user_id")),
      name = rs.getString("name"),
      type = rs.getString("type"),
      currency = rs.getString("currency"),
    )
  }
}
