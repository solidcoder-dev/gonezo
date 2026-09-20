package com.gonezo.persistence.recurrence

import com.gonezo.testing.TestDatabase
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class RecurringOccurrenceSchedulingKindMigrationTest {
    @Test
    fun `backfills occurrence kind from its parent plan using current scheduling rule`() {
        val database = TestDatabase()
        try {
            database.migrateTo(39)
            insertPlan(database, "one-shot-plan", "after_occurrences", 1)
            insertPlan(database, "recurring-plan", "after_occurrences", 3)
            insertOccurrence(database, "one-shot-occurrence", "one-shot-plan")
            insertOccurrence(database, "recurring-occurrence", "recurring-plan")

            database.migratePending()

            assertThat(database.jdbcTemplate.queryForList(
                "select id, schedule_kind from recurring_movement_occurrences order by id",
            ).associate { it["id"] to it["schedule_kind"] })
                .containsExactlyInAnyOrderEntriesOf(mapOf(
                    "one-shot-occurrence" to "one_shot",
                    "recurring-occurrence" to "recurring",
                ))
        } finally {
            database.close()
        }
    }

    private fun insertPlan(database: TestDatabase, id: String, endKind: String, count: Int) {
        database.jdbcTemplate.update(
            """insert into recurring_movements (
                id, movement_type, source_account_id, amount, currency, rule_frequency,
                rule_interval, rule_monthly_pattern, end_kind, end_after_occurrences,
                start_at, zone_id, status, generated_occurrences, created_at, updated_at
            ) values (?, 'expense', 'account', '1.00', 'EUR', 'daily', 1, 'day_of_month', ?, ?,
                     '2026-01-01T00:00:00Z', 'UTC', 'active', 0, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')""".trimIndent(),
            id, endKind, count,
        )
    }

    private fun insertOccurrence(database: TestDatabase, id: String, recurringMovementId: String) {
        database.jdbcTemplate.update(
            """insert into recurring_movement_occurrences (
                id, recurring_movement_id, due_at, status, created_at, updated_at
            ) values (?, ?, '2026-01-01T00:00:00Z', 'pending', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')""".trimIndent(),
            id, recurringMovementId,
        )
    }
}
