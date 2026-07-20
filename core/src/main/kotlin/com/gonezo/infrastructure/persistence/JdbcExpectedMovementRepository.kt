package com.gonezo.expected.infrastructure.persistence

import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcExpectedMovementRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : ExpectedMovementRepository {
  override fun save(movement: ExpectedMovement) {
    val sql = """
      insert into expected_movements (
        id, account_id, movement_type, amount, currency, expected_at,
        description, merchant, category_id, tag_names, origin_occurrence_id, origin_recurring_movement_id, status, resolved_transaction_id,
        created_at, updated_at, resolved_at, dismissed_at
      ) values (
        :id, :account_id, :movement_type, :amount, :currency, :expected_at,
        :description, :merchant, :category_id, :tag_names, :origin_occurrence_id, :origin_recurring_movement_id, :status, :resolved_transaction_id,
        :created_at, :updated_at, :resolved_at, :dismissed_at
      )
      on conflict(id) do update set
        account_id = excluded.account_id,
        movement_type = excluded.movement_type,
        amount = excluded.amount,
        currency = excluded.currency,
        expected_at = excluded.expected_at,
        description = excluded.description,
        merchant = excluded.merchant,
        category_id = excluded.category_id,
        tag_names = excluded.tag_names,
        origin_occurrence_id = excluded.origin_occurrence_id,
        origin_recurring_movement_id = excluded.origin_recurring_movement_id,
        status = excluded.status,
        resolved_transaction_id = excluded.resolved_transaction_id,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        resolved_at = excluded.resolved_at,
        dismissed_at = excluded.dismissed_at
    """.trimIndent()

    jdbcTemplate.update(sql, params(movement))
    jdbcTemplate.update(
      "delete from expected_movement_items where expected_movement_id = :expected_movement_id",
      MapSqlParameterSource("expected_movement_id", movement.id.toString()),
    )
    movement.splitItems.forEachIndexed { index, item ->
      jdbcTemplate.update(
        """
          insert into expected_movement_items (
            id, expected_movement_id, item_order, name, amount, source_template_item_id
          ) values (
            :id, :expected_movement_id, :item_order, :name, :amount, :source_template_item_id
          )
        """.trimIndent(),
        MapSqlParameterSource()
          .addValue("id", item.id)
          .addValue("expected_movement_id", movement.id.toString())
          .addValue("item_order", index)
          .addValue("name", item.name)
          .addValue("amount", item.amount.toPlainString())
          .addValue("source_template_item_id", item.sourceTemplateItemId),
      )
    }
  }

  override fun findById(id: ExpectedMovementId): ExpectedMovement? {
    val sql = """
      select *
      from expected_movements
      where id = :id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("id", id.toString()), baseRowMapper())
      .firstOrNull()
      ?.toMovement()
  }

  override fun findByOriginOccurrenceId(originOccurrenceId: String): ExpectedMovement? {
    val sql = """
      select *
      from expected_movements
      where origin_occurrence_id = :origin_occurrence_id
      limit 1
    """.trimIndent()
    return jdbcTemplate.query(
      sql,
      MapSqlParameterSource("origin_occurrence_id", originOccurrenceId),
      baseRowMapper(),
    ).firstOrNull()
      ?.toMovement()
  }

  override fun listByAccount(accountId: String, includeClosed: Boolean): List<ExpectedMovement> {
    val sql = buildString {
      append(
        """
        select *
        from expected_movements
        where account_id = :account_id
        """.trimIndent(),
      )
      if (!includeClosed) {
        append("\n  and status = :pending_status")
      }
      append("\norder by expected_at asc, id asc")
    }

    val params = MapSqlParameterSource()
      .addValue("account_id", accountId)
      .addValue("pending_status", ExpectedMovementStatus.PENDING.value)

    return jdbcTemplate.query(sql, params, baseRowMapper())
      .map { it.toMovement() }
  }

  private fun baseRowMapper(): RowMapper<ExpectedMovementRow> = RowMapper { rs: ResultSet, _ ->
    ExpectedMovementRow(
      id = ExpectedMovementId.from(rs.getString("id")),
      accountId = rs.getString("account_id"),
      type = ExpectedMovementType.from(rs.getString("movement_type")),
      amount = BigDecimal(rs.getString("amount")),
      currency = rs.getString("currency"),
      expectedAt = Instant.parse(rs.getString("expected_at")),
      description = rs.getString("description"),
      merchant = rs.getString("merchant"),
      categoryId = rs.getString("category_id"),
      tagNames = decodeTags(rs.getString("tag_names")),
      originOccurrenceId = rs.getString("origin_occurrence_id"),
      originRecurringMovementId = rs.getString("origin_recurring_movement_id"),
      status = ExpectedMovementStatus.from(rs.getString("status")),
      resolvedTransactionId = rs.getString("resolved_transaction_id"),
      createdAt = Instant.parse(rs.getString("created_at")),
      updatedAt = Instant.parse(rs.getString("updated_at")),
      resolvedAt = rs.getString("resolved_at")?.let(Instant::parse),
      dismissedAt = rs.getString("dismissed_at")?.let(Instant::parse),
    )
  }

  private fun params(movement: ExpectedMovement): MapSqlParameterSource =
    MapSqlParameterSource()
      .addValue("id", movement.id.toString())
      .addValue("account_id", movement.accountId)
      .addValue("movement_type", movement.type.value)
      .addValue("amount", movement.amount.toPlainString())
      .addValue("currency", movement.currency)
      .addValue("expected_at", movement.expectedAt.toString())
      .addValue("description", movement.description)
      .addValue("merchant", movement.merchant)
      .addValue("category_id", movement.categoryId)
      .addValue("tag_names", encodeTags(movement.tagNames))
      .addValue("origin_occurrence_id", movement.originOccurrenceId)
      .addValue("origin_recurring_movement_id", movement.originRecurringMovementId)
      .addValue("status", movement.status.value)
      .addValue("resolved_transaction_id", movement.resolvedTransactionId)
      .addValue("created_at", movement.createdAt.toString())
      .addValue("updated_at", movement.updatedAt.toString())
      .addValue("resolved_at", movement.resolvedAt?.toString())
      .addValue("dismissed_at", movement.dismissedAt?.toString())

  private fun ExpectedMovementRow.toMovement(): ExpectedMovement = ExpectedMovement(
    id = id,
    accountId = accountId,
    type = type,
    amount = amount,
    currency = currency,
    expectedAt = expectedAt,
    description = description,
    merchant = merchant,
    categoryId = categoryId,
    originOccurrenceId = originOccurrenceId,
    originRecurringMovementId = originRecurringMovementId,
    splitItems = loadSplitItems(id.toString()),
    status = status,
    resolvedTransactionId = resolvedTransactionId,
    createdAt = createdAt,
    updatedAt = updatedAt,
    resolvedAt = resolvedAt,
    dismissedAt = dismissedAt,
    tagNames = tagNames,
  )

  private fun loadSplitItems(expectedMovementId: String): List<ExpectedMovement.SplitItem> {
    val sql = """
      select id, name, amount, source_template_item_id
      from expected_movement_items
      where expected_movement_id = :expected_movement_id
      order by item_order asc, id asc
    """.trimIndent()

    return jdbcTemplate.query(
      sql,
      MapSqlParameterSource("expected_movement_id", expectedMovementId),
    ) { rs, _ ->
      ExpectedMovement.SplitItem(
        id = rs.getString("id"),
        name = rs.getString("name"),
        amount = BigDecimal(rs.getString("amount")),
        sourceTemplateItemId = rs.getString("source_template_item_id"),
      )
    }
  }

  private fun encodeTags(tags: List<String>): String = org.json.JSONArray(tags).toString()

  private fun decodeTags(value: String?): List<String> = value?.let { raw ->
    val json = org.json.JSONArray(raw)
    buildList { for (index in 0 until json.length()) add(json.getString(index)) }
  } ?: emptyList()

  private data class ExpectedMovementRow(
    val id: ExpectedMovementId,
    val accountId: String,
    val type: ExpectedMovementType,
    val amount: BigDecimal,
    val currency: String,
    val expectedAt: Instant,
    val description: String?,
    val merchant: String?,
    val categoryId: String?,
    val originOccurrenceId: String?,
    val originRecurringMovementId: String?,
    val status: ExpectedMovementStatus,
    val resolvedTransactionId: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
    val resolvedAt: Instant?,
    val dismissedAt: Instant?,
    val tagNames: List<String>,
  )
}
