package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.ledger.domain.AccountId
import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.math.BigDecimal
import java.time.Clock
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeParseException
import java.util.UUID

class AndroidRecurringCore internal constructor(
  private val recurringMovementRepository: RecurringMovementRepository,
  private val accountExists: (String) -> Boolean,
  private val clock: Clock,
) {
  private val scheduleCalculator = RecurrenceScheduleCalculator()

  fun createRecurringMovement(input: CreateRecurringMovementInput): UUID {
    val type = RecurringMovementType.from(requireText(input.type, "type is required"))
    val sourceAccountId = requireText(input.sourceAccountId, "sourceAccountId is required")
    ensureAccountExists(sourceAccountId, "source")

    val targetAccountId = input.targetAccountId?.trim()?.ifBlank { null }
    if (type == RecurringMovementType.TRANSFER) {
      val resolvedTargetAccountId = targetAccountId
        ?: throw IllegalArgumentException("targetAccountId is required for transfer recurrence")
      if (resolvedTargetAccountId == sourceAccountId) {
        throw IllegalArgumentException("source and destination accounts must be different")
      }
      ensureAccountExists(resolvedTargetAccountId, "target")
    }

    val id = RecurringMovementId.random()
    val now = Instant.now(clock)
    val movement = RecurringMovement.create(
      id = id,
      type = type,
      sourceAccountId = sourceAccountId,
      targetAccountId = targetAccountId,
      amount = parsePositiveDecimal(requireText(input.amount, "amount is required"), "amount must be greater than 0"),
      currency = requireText(input.currency, "currency is required").uppercase(),
      destinationAmount = input.destinationAmount?.let {
        parsePositiveDecimal(it, "destinationAmount must be greater than 0")
      },
      destinationCurrency = input.destinationCurrency,
      exchangeRate = input.exchangeRate?.let {
        parsePositiveDecimal(it, "exchangeRate must be greater than 0")
      },
      description = input.description,
      merchant = input.merchant,
      categoryId = input.categoryId,
      rule = toDomainRule(input.rule ?: RecurrenceRuleInput(frequency = "daily", interval = 1)),
      recurrenceEnd = toDomainEnd(input.recurrenceEnd ?: RecurrenceEndInput(kind = "never")),
      startAt = parseInstantOrDate(requireText(input.startAt, "startAt is required"), "startAt"),
      zoneId = input.zoneId?.trim()?.ifBlank { "UTC" } ?: "UTC",
      createdAt = now,
      scheduleCalculator = scheduleCalculator,
    )
    recurringMovementRepository.save(movement)
    return id.value
  }

  fun deactivateRecurringMovement(recurringMovementId: String, deactivatedAt: String?) {
    val id = try {
      RecurringMovementId.from(requireText(recurringMovementId, "recurringMovementId is required"))
    } catch (_: IllegalArgumentException) {
      throw IllegalArgumentException("recurringMovementId is required")
    }
    val existing = recurringMovementRepository.findById(id)
      ?: throw IllegalStateException("Recurring movement not found: $recurringMovementId")
    val at = if (deactivatedAt.isNullOrBlank()) {
      Instant.now(clock)
    } else {
      parseInstantOrDate(deactivatedAt, "deactivatedAt")
    }
    recurringMovementRepository.save(existing.deactivate(at))
  }

  fun listRecurringMovements(sourceAccountId: String): List<RecurringMovementView> {
    val resolvedSourceAccountId = requireText(sourceAccountId, "sourceAccountId is required")
    return recurringMovementRepository.listBySourceAccount(resolvedSourceAccountId)
      .sortedWith(
        compareBy<RecurringMovement> { it.nextDueAt ?: Instant.MAX }
          .thenBy { it.id.toString() },
      )
      .map(::toView)
  }

  private fun toView(movement: RecurringMovement): RecurringMovementView {
    val recurrenceEnd = when (val end = movement.recurrenceEnd) {
      RecurrenceEnd.Never -> RecurrenceEndInput(kind = "never")
      is RecurrenceEnd.OnDate -> RecurrenceEndInput(kind = "on_date", onDate = end.date.toString())
      is RecurrenceEnd.AfterOccurrences -> RecurrenceEndInput(kind = "after_occurrences", afterOccurrences = end.count)
    }

    return RecurringMovementView(
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
      status = movement.status.value,
      startAt = movement.startAt.toString(),
      nextDueAt = movement.nextDueAt?.toString(),
      zoneId = movement.zoneId,
      generatedOccurrences = movement.generatedOccurrences,
      rule = RecurrenceRuleInput(
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

  private fun ensureAccountExists(accountId: String, label: String) {
    if (!accountExists(accountId)) {
      throw IllegalArgumentException("$label account not found")
    }
  }

  private fun toDomainRule(input: RecurrenceRuleInput): RecurrenceRule {
    val frequency = RecurrenceFrequency.from(requireText(input.frequency, "rule.frequency is required"))
    val interval = input.interval ?: 1
    val weeklyDays = (input.weeklyDays ?: emptyList()).map(DayOfWeek::of).toSet()
    val monthlyPattern = MonthlyPattern.from((input.monthlyPattern ?: "day_of_month").trim())
    val monthlyWeekday = input.monthlyWeekday?.let(DayOfWeek::of)
    return RecurrenceRule(
      frequency = frequency,
      interval = interval,
      weeklyDays = weeklyDays,
      monthlyPattern = monthlyPattern,
      dayOfMonth = input.dayOfMonth,
      monthlyWeekOrdinal = input.monthlyWeekOrdinal,
      monthlyWeekday = monthlyWeekday,
    )
  }

  private fun toDomainEnd(input: RecurrenceEndInput): RecurrenceEnd = when (input.kind.trim().lowercase()) {
    "never" -> RecurrenceEnd.Never
    "on_date" -> RecurrenceEnd.OnDate(LocalDate.parse(requireText(input.onDate, "recurrenceEnd.onDate is required")))
    "after_occurrences" -> RecurrenceEnd.AfterOccurrences(
      input.afterOccurrences ?: throw IllegalArgumentException("recurrenceEnd.afterOccurrences is required"),
    )

    else -> throw IllegalArgumentException("Unsupported recurrence end kind: ${input.kind}")
  }

  private fun parsePositiveDecimal(rawValue: String, errorMessage: String): BigDecimal {
    val parsed = rawValue.trim().toBigDecimalOrNull()
      ?: throw IllegalArgumentException(errorMessage)
    if (parsed <= BigDecimal.ZERO) {
      throw IllegalArgumentException(errorMessage)
    }
    return parsed
  }

  private fun parseInstantOrDate(rawValue: String, fieldName: String): Instant {
    val value = requireText(rawValue, "$fieldName is required")
    return try {
      Instant.parse(value)
    } catch (_: DateTimeParseException) {
      try {
        LocalDateTime.parse(value).toInstant(ZoneOffset.UTC)
      } catch (_: DateTimeParseException) {
        try {
          LocalDate.parse(value).atStartOfDay().toInstant(ZoneOffset.UTC)
        } catch (_: DateTimeParseException) {
          throw IllegalArgumentException("$fieldName must be an ISO-8601 datetime or date")
        }
      }
    }
  }

  private fun requireText(value: String?, message: String): String {
    val trimmed = value?.trim()
    if (trimmed.isNullOrEmpty()) {
      throw IllegalArgumentException(message)
    }
    return trimmed
  }

  data class CreateRecurringMovementInput(
    val type: String?,
    val sourceAccountId: String?,
    val targetAccountId: String?,
    val amount: String?,
    val currency: String?,
    val destinationAmount: String?,
    val destinationCurrency: String?,
    val exchangeRate: String?,
    val description: String?,
    val merchant: String?,
    val categoryId: String? = null,
    val rule: RecurrenceRuleInput?,
    val recurrenceEnd: RecurrenceEndInput?,
    val startAt: String?,
    val zoneId: String? = "UTC",
  )

  data class RecurrenceRuleInput(
    val frequency: String,
    val interval: Int? = 1,
    val weeklyDays: List<Int>? = emptyList(),
    val monthlyPattern: String? = "day_of_month",
    val dayOfMonth: Int? = null,
    val monthlyWeekOrdinal: Int? = null,
    val monthlyWeekday: Int? = null,
  )

  data class RecurrenceEndInput(
    val kind: String = "never",
    val onDate: String? = null,
    val afterOccurrences: Int? = null,
  )

  data class RecurringMovementView(
    val id: String,
    val type: String,
    val sourceAccountId: String,
    val targetAccountId: String?,
    val amount: String,
    val currency: String,
    val destinationAmount: String?,
    val destinationCurrency: String?,
    val exchangeRate: String?,
    val description: String?,
    val merchant: String?,
    val categoryId: String?,
    val status: String,
    val startAt: String,
    val nextDueAt: String?,
    val zoneId: String,
    val generatedOccurrences: Int,
    val rule: RecurrenceRuleInput,
    val recurrenceEnd: RecurrenceEndInput,
  )

  companion object {
    @Volatile
    private var instance: AndroidRecurringCore? = null

    @JvmStatic
    fun getInstance(context: Context): AndroidRecurringCore {
      val existing = instance
      if (existing != null) {
        return existing
      }
      return synchronized(this) {
        val synchronizedExisting = instance
        if (synchronizedExisting != null) {
          synchronizedExisting
        } else {
          val database = CoreDatabase(context.applicationContext)
          val accountRepository = AndroidLedgerAccountRepository(database)
          val recurringRepository = AndroidRecurringMovementRepository(database)
          AndroidRecurringCore(
            recurringMovementRepository = recurringRepository,
            accountExists = { accountId ->
              val uuid = runCatching { UUID.fromString(accountId.trim()) }.getOrNull()
              if (uuid == null) {
                false
              } else {
                accountRepository.exists(AccountId(uuid))
              }
            },
            clock = Clock.systemUTC(),
          ).also { created -> instance = created }
        }
      }
    }
  }
}
