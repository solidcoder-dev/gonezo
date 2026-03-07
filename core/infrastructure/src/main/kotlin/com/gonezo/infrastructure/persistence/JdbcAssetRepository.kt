package com.gonezo.infrastructure.persistence

import com.gonezo.domain.investments.Asset
import com.gonezo.domain.investments.ports.AssetRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcAssetRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : AssetRepository {

  override fun get(id: UUID): Asset {
    val sql = """
      select id, symbol_or_name, asset_type, currency
      from assets
      where id = :id
    """.trimIndent()

    val params = MapSqlParameterSource("id", id)
    return jdbcTemplate.queryForObject(sql, params, assetRowMapper())!!
  }

  private fun assetRowMapper(): RowMapper<Asset> = RowMapper { rs: ResultSet, _ ->
    Asset(
      id = UUID.fromString(rs.getString("id")),
      symbolOrName = rs.getString("symbol_or_name"),
      assetType = rs.getString("asset_type"),
      currency = rs.getString("currency"),
    )
  }
}
