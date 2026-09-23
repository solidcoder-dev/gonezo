package com.gonezo.infrastructure.backup

import com.gonezo.recurrence.application.backup.BackupRecurringOccurrence
import com.gonezo.recurrence.application.backup.RecurrenceBackupSection
import org.assertj.core.api.Assertions.assertThat
import org.json.JSONObject
import org.junit.jupiter.api.Test

class RecurrenceBackupSchedulingKindTest {
    private val codec = RecurrenceBackupSectionCodec()

    @Test
    fun `version two backup preserves occurrence scheduling kind`() {
        val section = RecurrenceBackupSection(
            movements = emptyList(),
            occurrences = listOf(occurrence("one_shot")),
        )

        val encoded = codec.encode(section)
        val decoded = codec.decode(2, encoded.getJSONObject("data"))

        assertThat(encoded.getInt("version")).isEqualTo(2)
        assertThat(decoded.occurrences.single().schedulingKind).isEqualTo("one_shot")
    }

    @Test
    fun `version one backup occurrence omitting kind remains readable`() {
        val data = JSONObject()
            .put("movements", org.json.JSONArray())
            .put(
                "occurrences",
                org.json.JSONArray().put(
                    JSONObject()
                        .put("id", "occurrence")
                        .put("recurringMovementId", "schedule")
                        .put("dueAt", "2026-01-01T00:00:00Z")
                        .put("status", "pending")
                        .put("createdAt", "2026-01-01T00:00:00Z")
                        .put("updatedAt", "2026-01-01T00:00:00Z"),
                ),
            )

        val decoded = codec.decode(1, data)

        assertThat(decoded.occurrences.single().schedulingKind).isNull()
    }

    private fun occurrence(schedulingKind: String) = BackupRecurringOccurrence(
        id = "occurrence",
        recurringMovementId = "schedule",
        dueAt = "2026-01-01T00:00:00Z",
        status = "pending",
        ledgerTransactionId = null,
        errorCode = null,
        errorMessage = null,
        createdAt = "2026-01-01T00:00:00Z",
        updatedAt = "2026-01-01T00:00:00Z",
        acknowledgedAt = null,
        schedulingKind = schedulingKind,
    )
}
