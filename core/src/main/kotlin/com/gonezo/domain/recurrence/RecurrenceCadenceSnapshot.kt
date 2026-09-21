package com.gonezo.recurrence.domain

data class RecurrenceCadenceSnapshot(val frequency: RecurrenceFrequency, val interval: Int) {
    init {
        require(interval >= 1) { "recurrence interval must be greater than 0" }
    }

    companion object {
        fun from(rule: RecurrenceRule): RecurrenceCadenceSnapshot = RecurrenceCadenceSnapshot(rule.frequency, rule.interval)
    }
}
