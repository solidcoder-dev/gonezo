package com.gonezo.infrastructure.persistence

import com.gonezo.domain.budgeting.BudgetPlan
import com.gonezo.domain.budgeting.BudgetPlanPeriod
import com.gonezo.domain.budgeting.EffectiveDatingPolicy
import com.gonezo.domain.budgeting.NegativePolicy
import com.gonezo.domain.budgeting.ReservationPolicy
import com.gonezo.domain.budgeting.ports.BudgetPlanRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcBudgetPlanRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : BudgetPlanRepository {

  override fun get(id: UUID): BudgetPlan {
    val sql = """
      select id, user_id, period, negative_policy, reservation_policy, effective_dating_policy
      from budget_plans
      where id = :id
    """.trimIndent()

    val params = MapSqlParameterSource("id", id)
    return jdbcTemplate.queryForObject(sql, params, planRowMapper())!!
  }

  override fun save(plan: BudgetPlan) {
    val sql = """
      insert into budget_plans (id, user_id, period, negative_policy, reservation_policy, effective_dating_policy)
      values (:id, :user_id, :period, :negative_policy, :reservation_policy, :effective_dating_policy)
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", plan.id)
      .addValue("user_id", plan.userId)
      .addValue("period", plan.period.value)
      .addValue("negative_policy", plan.negativePolicy.value)
      .addValue("reservation_policy", plan.reservationPolicy.value)
      .addValue("effective_dating_policy", plan.effectiveDatingPolicy.value)

    jdbcTemplate.update(sql, params)
  }

  private fun planRowMapper(): RowMapper<BudgetPlan> = RowMapper { rs: ResultSet, _ ->
    BudgetPlan(
      id = UUID.fromString(rs.getString("id")),
      userId = UUID.fromString(rs.getString("user_id")),
      period = BudgetPlanPeriod.from(rs.getString("period")),
      negativePolicy = NegativePolicy.from(rs.getString("negative_policy")),
      reservationPolicy = ReservationPolicy.from(rs.getString("reservation_policy")),
      effectiveDatingPolicy = EffectiveDatingPolicy.from(rs.getString("effective_dating_policy")),
    )
  }
}
