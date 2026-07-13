package dev.solidcoder.interpretation.json

import dev.solidcoder.interpretation.domain.AllowedValue

internal data class AllowedValueAliasMap(
  private val aliasesByStableValue: Map<String, String>,
  private val stableValueByAlias: Map<String, AllowedValue>,
) {
  val allowedValues: List<AllowedValueAlias> = stableValueByAlias.entries
    .sortedBy { it.key.removePrefix("v").toInt() }
    .map { (alias, allowedValue) ->
      AllowedValueAlias(
        alias = alias,
        label = allowedValue.label,
        description = allowedValue.description,
      )
    }

  fun stableValueForAlias(alias: String): String = stableValueByAlias[alias]?.stableValue
    ?: throw IllegalArgumentException("unknown enum alias")

  fun aliasForStableValue(stableValue: String): String = aliasesByStableValue[stableValue]
    ?: throw IllegalArgumentException("unknown enum stableValue")

  companion object {
    fun from(allowedValues: List<AllowedValue>): AllowedValueAliasMap {
      val aliasesByStableValue = linkedMapOf<String, String>()
      val stableValueByAlias = linkedMapOf<String, AllowedValue>()
      allowedValues.forEachIndexed { index, allowedValue ->
        val alias = "v$index"
        aliasesByStableValue[allowedValue.stableValue] = alias
        stableValueByAlias[alias] = allowedValue
      }
      return AllowedValueAliasMap(
        aliasesByStableValue = aliasesByStableValue,
        stableValueByAlias = stableValueByAlias,
      )
    }
  }
}

internal data class AllowedValueAlias(
  val alias: String,
  val label: String,
  val description: String?,
)
