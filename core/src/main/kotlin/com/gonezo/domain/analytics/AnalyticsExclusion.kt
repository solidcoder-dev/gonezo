package com.gonezo.analytics.domain
import java.time.Instant
import java.util.UUID

data class AnalyticsExclusion(
  val id: UUID,
  val scopeType: AnalyticsExclusionScopeType,
  val scopeId: String,
  val reason: AnalyticsExclusionReason,
  val createdAt: Instant,
) {
  init {
    require(scopeId.isNotBlank()) { "analytics exclusion scope id is required" }
  }
}
