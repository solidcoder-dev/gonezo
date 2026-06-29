package com.gonezo.analytics.domain.ports

import com.gonezo.analytics.domain.AnalyticsExclusion
import com.gonezo.analytics.domain.AnalyticsExclusionScopeType

interface AnalyticsExclusionRepository {
  fun save(exclusion: AnalyticsExclusion)

  fun findByScope(scopeType: AnalyticsExclusionScopeType, scopeId: String): List<AnalyticsExclusion>

  fun listAll(): List<AnalyticsExclusion>
}
