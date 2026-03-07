package com.gonezo.infrastructure.persistence

import com.gonezo.domain.investments.FinancialContainer
import com.gonezo.domain.investments.ports.FinancialContainerRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcFinancialContainerRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : FinancialContainerRepository {

  override fun get(id: UUID): FinancialContainer {
    val sql = """
      select id, user_id, name, container_type, currency
      from financial_containers
      where id = :id
    """.trimIndent()

    val params = MapSqlParameterSource("id", id)
    return jdbcTemplate.queryForObject(sql, params, containerRowMapper())!!
  }

  private fun containerRowMapper(): RowMapper<FinancialContainer> = RowMapper { rs: ResultSet, _ ->
    FinancialContainer(
      id = UUID.fromString(rs.getString("id")),
      userId = UUID.fromString(rs.getString("user_id")),
      name = rs.getString("name"),
      containerType = rs.getString("container_type"),
      currency = rs.getString("currency"),
    )
  }
}
