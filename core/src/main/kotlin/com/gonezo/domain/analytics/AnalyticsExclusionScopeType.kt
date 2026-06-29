package com.gonezo.analytics.domain

enum class AnalyticsExclusionScopeType(val value: String) {
  MOVEMENT("movement"),
  SPLIT_ITEM("split_item"),
  SHARE_PARTICIPANT("share_participant"),
  EXPECTED_MOVEMENT("expected_movement"),
  ;

  companion object {
    fun from(value: String): AnalyticsExclusionScopeType =
      entries.firstOrNull { it.value.equals(value.trim(), ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported analytics exclusion scope type: $value")
  }
}
