package com.gonezo.recurrence.domain

enum class SchedulingKind(val value: String) {
    RECURRING("recurring"),
    ONE_SHOT("one_shot"),
    ;

    companion object {
        fun from(value: String): SchedulingKind = entries.firstOrNull { it.value == value.trim().lowercase() }
            ?: throw IllegalArgumentException("Unsupported scheduling kind: $value")
    }
}

fun resolveCurrentSchedulingKind(recurrenceEnd: RecurrenceEnd): SchedulingKind = if (recurrenceEnd is RecurrenceEnd.AfterOccurrences && recurrenceEnd.count == 1) {
    SchedulingKind.ONE_SHOT
} else {
    SchedulingKind.RECURRING
}
