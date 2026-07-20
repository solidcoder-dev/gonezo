package com.gonezo.recurrence.infrastructure.persistence

import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

@Repository
class JdbcRecurringMovementRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : RecurringMovementRepository {
  override fun save(movement: RecurringMovement) {
    val sql = """
      insert into recurring_movements (
        id, movement_type, source_account_id, target_account_id, amount, currency,
        destination_amount, destination_currency, exchange_rate, description, merchant, category_id, tag_names, review_policy,
        rule_frequency, rule_interval, rule_weekdays, rule_day_of_month, rule_monthly_pattern, rule_monthly_nth, rule_monthly_weekday,
        end_kind, end_on_date, end_after_occurrences,
        start_at, zone_id, next_due_at, status, generated_occurrences,
        created_at, updated_at, deactivated_at, completed_at
      ) values (
        :id, :movement_type, :source_account_id, :target_account_id, :amount, :currency,
        :destination_amount, :destination_currency, :exchange_rate, :description, :merchant, :category_id, :tag_names, :review_policy,
        :rule_frequency, :rule_interval, :rule_weekdays, :rule_day_of_month, :rule_monthly_pattern, :rule_monthly_nth, :rule_monthly_weekday,
        :end_kind, :end_on_date, :end_after_occurrences,
        :start_at, :zone_id, :next_due_at, :status, :generated_occurrences,
        :created_at, :updated_at, :deactivated_at, :completed_at
      )
      on conflict(id) do update set
        movement_type = excluded.movement_type,
        source_account_id = excluded.source_account_id,
        target_account_id = excluded.target_account_id,
        amount = excluded.amount,
        currency = excluded.currency,
        destination_amount = excluded.destination_amount,
        destination_currency = excluded.destination_currency,
        exchange_rate = excluded.exchange_rate,
        description = excluded.description,
        merchant = excluded.merchant,
        category_id = excluded.category_id,
        tag_names = excluded.tag_names,
        review_policy = excluded.review_policy,
        rule_frequency = excluded.rule_frequency,
        rule_interval = excluded.rule_interval,
        rule_weekdays = excluded.rule_weekdays,
        rule_day_of_month = excluded.rule_day_of_month,
        rule_monthly_pattern = excluded.rule_monthly_pattern,
        rule_monthly_nth = excluded.rule_monthly_nth,
        rule_monthly_weekday = excluded.rule_monthly_weekday,
        end_kind = excluded.end_kind,
        end_on_date = excluded.end_on_date,
        end_after_occurrences = excluded.end_after_occurrences,
        start_at = excluded.start_at,
        zone_id = excluded.zone_id,
        next_due_at = excluded.next_due_at,
        status = excluded.status,
        generated_occurrences = excluded.generated_occurrences,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        deactivated_at = excluded.deactivated_at,
        completed_at = excluded.completed_at
    """.trimIndent()

    jdbcTemplate.update(sql, movementParams(movement))
    jdbcTemplate.update(
      "delete from recurring_movement_items where recurring_movement_id = :recurring_movement_id",
      MapSqlParameterSource("recurring_movement_id", movement.id.toString()),
    )
    movement.splitItems.forEachIndexed { index, item ->
      jdbcTemplate.update(
        """
          insert into recurring_movement_items (
            id, recurring_movement_id, item_order, name, amount
          ) values (
            :id, :recurring_movement_id, :item_order, :name, :amount
          )
        """.trimIndent(),
        MapSqlParameterSource()
          .addValue("id", item.id)
          .addValue("recurring_movement_id", movement.id.toString())
          .addValue("item_order", index)
          .addValue("name", item.name)
          .addValue("amount", item.amount.toPlainString()),
      )
    }
  }

  override fun findById(id: RecurringMovementId): RecurringMovement? {
    val sql = """
      select *
      from recurring_movements
      where id = :id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("id", id.toString()), baseRowMapper())
      .firstOrNull()
      ?.toMovement()
  }

  override fun findDue(now: Instant, limit: Int): List<RecurringMovement> {
    val sql = """
      select *
      from recurring_movements
      where status = :status_active
        and next_due_at is not null
        and next_due_at <= :now
      order by next_due_at asc, id asc
      limit :limit
    """.trimIndent()
    val params = MapSqlParameterSource()
      .addValue("status_active", RecurringMovementStatus.ACTIVE.value)
      .addValue("now", now.toString())
      .addValue("limit", limit)
    return jdbcTemplate.query(sql, params, baseRowMapper())
      .map { it.toMovement() }
  }

  override fun listBySourceAccount(accountId: String): List<RecurringMovement> {
    val sql = """
      select *
      from recurring_movements
      where source_account_id = :account_id
         or (movement_type = :transfer_type and target_account_id = :account_id)
      order by created_at desc, id desc
    """.trimIndent()
    return jdbcTemplate.query(
      sql,
      MapSqlParameterSource()
        .addValue("account_id", accountId)
        .addValue("transfer_type", RecurringMovementType.TRANSFER.value),
      baseRowMapper(),
    )
      .map { it.toMovement() }
  }

  private fun baseRowMapper(): RowMapper<RecurringMovementRow> = RowMapper { rs: ResultSet, _ ->
    val movementId = RecurringMovementId.from(rs.getString("id"))
    val recurrenceEnd = when (rs.getString("end_kind")) {
      "never" -> RecurrenceEnd.Never
      "on_date" -> RecurrenceEnd.OnDate(LocalDate.parse(rs.getString("end_on_date")))
      "after_occurrences" -> RecurrenceEnd.AfterOccurrences(rs.getInt("end_after_occurrences"))
      else -> throw IllegalArgumentException("Unsupported recurrence end kind: ${rs.getString("end_kind")}")
    }

    val weeklyDays = rs.getString("rule_weekdays")
      ?.split(',')
      ?.mapNotNull { token ->
        token.trim().takeIf(String::isNotBlank)?.let { DayOfWeek.valueOf(it) }
      }
      ?.toSet()
      ?: emptySet()

    val monthlyWeekday = rs.getString("rule_monthly_weekday")
      ?.trim()
      ?.takeIf { it.isNotBlank() }
      ?.let(DayOfWeek::valueOf)

    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.from(rs.getString("rule_frequency")),
      interval = rs.getInt("rule_interval"),
      weeklyDays = weeklyDays,
      monthlyPattern = MonthlyPattern.from(rs.getString("rule_monthly_pattern")),
      dayOfMonth = rs.getObject("rule_day_of_month")?.toString()?.toInt(),
      monthlyWeekOrdinal = rs.getObject("rule_monthly_nth")?.toString()?.toInt(),
      monthlyWeekday = monthlyWeekday,
    )

    RecurringMovementRow(
      id = movementId,
      type = RecurringMovementType.from(rs.getString("movement_type")),
      sourceAccountId = rs.getString("source_account_id"),
      targetAccountId = rs.getString("target_account_id"),
      amount = rs.getObject("amount", BigDecimal::class.java),
      currency = rs.getString("currency"),
      destinationAmount = rs.getObject("destination_amount", BigDecimal::class.java),
      destinationCurrency = rs.getString("destination_currency"),
      exchangeRate = rs.getObject("exchange_rate", BigDecimal::class.java),
      description = rs.getString("description"),
      merchant = rs.getString("merchant"),
      categoryId = rs.getString("category_id"),
      tagNames = decodeTags(rs.getString("tag_names")),
      reviewPolicy = RecurringMovementReviewPolicy.from(rs.getString("review_policy")),
      rule = rule,
      recurrenceEnd = recurrenceEnd,
      startAt = Instant.parse(rs.getString("start_at")),
      zoneId = rs.getString("zone_id"),
      nextDueAt = rs.getString("next_due_at")?.let(Instant::parse),
      status = RecurringMovementStatus.from(rs.getString("status")),
      generatedOccurrences = rs.getInt("generated_occurrences"),
      createdAt = Instant.parse(rs.getString("created_at")),
      updatedAt = Instant.parse(rs.getString("updated_at")),
      deactivatedAt = rs.getString("deactivated_at")?.let(Instant::parse),
      completedAt = rs.getString("completed_at")?.let(Instant::parse),
    )
  }

  private fun movementParams(movement: RecurringMovement): MapSqlParameterSource {
    val (endKind, endOnDate, endAfterOccurrences) = when (val end = movement.recurrenceEnd) {
      RecurrenceEnd.Never -> Triple("never", null, null)
      is RecurrenceEnd.OnDate -> Triple("on_date", end.date.toString(), null)
      is RecurrenceEnd.AfterOccurrences -> Triple("after_occurrences", null, end.count)
    }

    return MapSqlParameterSource()
      .addValue("id", movement.id.toString())
      .addValue("movement_type", movement.type.value)
      .addValue("source_account_id", movement.sourceAccountId)
      .addValue("target_account_id", movement.targetAccountId)
      .addValue("amount", movement.amount)
      .addValue("currency", movement.currency)
      .addValue("destination_amount", movement.destinationAmount)
      .addValue("destination_currency", movement.destinationCurrency)
      .addValue("exchange_rate", movement.exchangeRate)
      .addValue("description", movement.description)
      .addValue("merchant", movement.merchant)
      .addValue("category_id", movement.categoryId)
      .addValue("tag_names", encodeTags(movement.tagNames))
      .addValue("review_policy", movement.reviewPolicy.value)
      .addValue("rule_frequency", movement.rule.frequency.value)
      .addValue("rule_interval", movement.rule.interval)
      .addValue("rule_weekdays", movement.rule.weeklyDays.joinToString(",") { it.name })
      .addValue("rule_day_of_month", movement.rule.dayOfMonth)
      .addValue("rule_monthly_pattern", movement.rule.monthlyPattern.value)
      .addValue("rule_monthly_nth", movement.rule.monthlyWeekOrdinal)
      .addValue("rule_monthly_weekday", movement.rule.monthlyWeekday?.name)
      .addValue("end_kind", endKind)
      .addValue("end_on_date", endOnDate)
      .addValue("end_after_occurrences", endAfterOccurrences)
      .addValue("start_at", movement.startAt.toString())
      .addValue("zone_id", movement.zoneId)
      .addValue("next_due_at", movement.nextDueAt?.toString())
      .addValue("status", movement.status.value)
      .addValue("generated_occurrences", movement.generatedOccurrences)
      .addValue("created_at", movement.createdAt.toString())
      .addValue("updated_at", movement.updatedAt.toString())
      .addValue("deactivated_at", movement.deactivatedAt?.toString())
      .addValue("completed_at", movement.completedAt?.toString())
  }

  private fun loadSplitItems(recurringMovementId: String): List<RecurringMovement.SplitItem> {
    val sql = """
      select id, name, amount
      from recurring_movement_items
      where recurring_movement_id = :recurring_movement_id
      order by item_order asc, id asc
    """.trimIndent()

    return jdbcTemplate.query(
      sql,
      MapSqlParameterSource("recurring_movement_id", recurringMovementId),
    ) { rs, _ ->
      RecurringMovement.SplitItem(
        id = rs.getString("id"),
        name = rs.getString("name"),
        amount = BigDecimal(rs.getString("amount")),
      )
    }
  }

  private fun encodeTags(tags: List<String>): String = org.json.JSONArray(tags).toString()

  private fun decodeTags(value: String?): List<String> = value?.let { raw ->
    val json = org.json.JSONArray(raw)
    buildList { for (index in 0 until json.length()) add(json.getString(index)) }
  } ?: emptyList()

  private fun RecurringMovementRow.toMovement(): RecurringMovement = RecurringMovement(
    id = id,
    type = type,
    sourceAccountId = sourceAccountId,
    targetAccountId = targetAccountId,
    amount = amount,
    currency = currency,
    destinationAmount = destinationAmount,
    destinationCurrency = destinationCurrency,
    exchangeRate = exchangeRate,
    description = description,
    merchant = merchant,
    categoryId = categoryId,
    reviewPolicy = reviewPolicy,
    splitItems = loadSplitItems(id.toString()),
    rule = rule,
    recurrenceEnd = recurrenceEnd,
    startAt = startAt,
    zoneId = zoneId,
    nextDueAt = nextDueAt,
    status = status,
    generatedOccurrences = generatedOccurrences,
    createdAt = createdAt,
    updatedAt = updatedAt,
    deactivatedAt = deactivatedAt,
    completedAt = completedAt,
  )

  private data class RecurringMovementRow(
    val id: RecurringMovementId,
    val type: RecurringMovementType,
    val sourceAccountId: String,
    val targetAccountId: String?,
    val amount: BigDecimal,
    val currency: String,
    val destinationAmount: BigDecimal?,
    val destinationCurrency: String?,
    val exchangeRate: BigDecimal?,
    val description: String?,
    val merchant: String?,
    val categoryId: String?,
    val tagNames: List<String>,
    val reviewPolicy: RecurringMovementReviewPolicy,
    val rule: RecurrenceRule,
    val recurrenceEnd: RecurrenceEnd,
    val startAt: Instant,
    val zoneId: String,
    val nextDueAt: Instant?,
    val status: RecurringMovementStatus,
    val generatedOccurrences: Int,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deactivatedAt: Instant?,
    val completedAt: Instant?,
  )
}
