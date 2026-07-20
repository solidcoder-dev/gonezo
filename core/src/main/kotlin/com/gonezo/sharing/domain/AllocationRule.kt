package com.gonezo.sharing.domain

import java.math.BigDecimal

sealed interface AllocationRule {
  data class Parts(
    val payerParts: Int,
    val participantParts: List<Int>,
  ) : AllocationRule

  data class FixedAmounts(
    val amounts: List<BigDecimal>,
  ) : AllocationRule

  data class Percentages(
    val payerPercentage: BigDecimal,
    val participantPercentages: List<BigDecimal>,
  ) : AllocationRule

  data object EqualSplit : AllocationRule
}

object AllocationCalculator {
  fun allocate(total: BigDecimal, rule: AllocationRule, scale: Int): List<BigDecimal> {
    require(total > BigDecimal.ZERO) { "allocation total must be positive" }
    require(scale >= 0) { "allocation scale must not be negative" }

    return when (rule) {
      is AllocationRule.Parts -> allocateParts(total, rule, scale)
      is AllocationRule.FixedAmounts -> allocateFixedAmounts(total, rule)
      is AllocationRule.Percentages -> allocatePercentages(total, rule, scale)
      AllocationRule.EqualSplit -> error("EqualSplit requires a participant count")
    }
  }

  fun allocateEqualSplit(total: BigDecimal, participantCount: Int, scale: Int): List<BigDecimal> {
    require(participantCount > 0) { "participant count must be positive" }
    val unit = total.divide(BigDecimal(participantCount), scale + 8, java.math.RoundingMode.DOWN)
      .setScale(scale, java.math.RoundingMode.DOWN)
    return List(participantCount) { unit }
  }

  private fun allocateParts(total: BigDecimal, rule: AllocationRule.Parts, scale: Int): List<BigDecimal> {
    require(rule.payerParts > 0) { "payer parts must be positive" }
    require(rule.participantParts.isNotEmpty()) { "participant parts are required" }
    require(rule.participantParts.all { it > 0 }) { "participant parts must be positive" }
    val denominator = rule.payerParts + rule.participantParts.sum()
    val unit = total.divide(BigDecimal(denominator), scale + 8, java.math.RoundingMode.DOWN)
    return rule.participantParts.map { unit.multiply(BigDecimal(it)).setScale(scale, java.math.RoundingMode.DOWN) }
  }

  private fun allocateFixedAmounts(total: BigDecimal, rule: AllocationRule.FixedAmounts): List<BigDecimal> {
    require(rule.amounts.isNotEmpty()) { "fixed amounts are required" }
    require(rule.amounts.all { it > BigDecimal.ZERO }) { "fixed amounts must be positive" }
    require(rule.amounts.sumOf { it } <= total) { "fixed amounts cannot exceed total" }
    return rule.amounts
  }

  private fun allocatePercentages(total: BigDecimal, rule: AllocationRule.Percentages, scale: Int): List<BigDecimal> {
    require(rule.payerPercentage >= BigDecimal.ZERO) { "payer percentage must not be negative" }
    require(rule.participantPercentages.isNotEmpty()) { "participant percentages are required" }
    require(rule.participantPercentages.all { it > BigDecimal.ZERO }) { "participant percentages must be positive" }
    require(rule.payerPercentage + rule.participantPercentages.sumOf { it } == BigDecimal(100)) {
      "allocation percentages must total 100"
    }
    return rule.participantPercentages.map { total.multiply(it).movePointLeft(2).setScale(scale, java.math.RoundingMode.DOWN) }
  }
}
