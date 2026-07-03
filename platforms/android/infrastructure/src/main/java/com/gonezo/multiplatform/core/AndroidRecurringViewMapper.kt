package com.gonezo.multiplatform.core

import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurringMovement

internal object AndroidRecurringViewMapper {
  fun toView(movement: RecurringMovement): AndroidRecurringCore.RecurringMovementView {
    val recurrenceEnd = when (val end = movement.recurrenceEnd) {
      RecurrenceEnd.Never -> AndroidRecurringCore.RecurrenceEndInput(kind = "never")
      is RecurrenceEnd.OnDate -> AndroidRecurringCore.RecurrenceEndInput(kind = "on_date", onDate = end.date.toString())
      is RecurrenceEnd.AfterOccurrences -> AndroidRecurringCore.RecurrenceEndInput(
        kind = "after_occurrences",
        afterOccurrences = end.count,
      )
    }

    return AndroidRecurringCore.RecurringMovementView(
      id = movement.id.toString(),
      type = movement.type.value,
      sourceAccountId = movement.sourceAccountId,
      targetAccountId = movement.targetAccountId,
      amount = movement.amount.toPlainString(),
      currency = movement.currency,
      destinationAmount = movement.destinationAmount?.toPlainString(),
      destinationCurrency = movement.destinationCurrency,
      exchangeRate = movement.exchangeRate?.toPlainString(),
      description = movement.description,
      merchant = movement.merchant,
      categoryId = movement.categoryId,
      reviewPolicy = movement.reviewPolicy.value,
      splitItems = movement.splitItems.map {
        AndroidRecurringCore.SplitItem(
          id = it.id,
          name = it.name,
          amount = it.amount.toPlainString(),
        )
      },
      status = movement.status.value,
      startAt = movement.startAt.toString(),
      nextDueAt = movement.nextDueAt?.toString(),
      zoneId = movement.zoneId,
      generatedOccurrences = movement.generatedOccurrences,
      rule = AndroidRecurringCore.RecurrenceRuleInput(
        frequency = movement.rule.frequency.value,
        interval = movement.rule.interval,
        weeklyDays = movement.rule.weeklyDays.sortedBy { it.value }.map { it.value },
        monthlyPattern = movement.rule.monthlyPattern.value,
        dayOfMonth = movement.rule.dayOfMonth,
        monthlyWeekOrdinal = movement.rule.monthlyWeekOrdinal,
        monthlyWeekday = movement.rule.monthlyWeekday?.value,
      ),
      recurrenceEnd = recurrenceEnd,
    )
  }
}
