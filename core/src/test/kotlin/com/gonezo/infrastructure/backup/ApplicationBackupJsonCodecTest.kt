package com.gonezo.infrastructure.backup

import com.gonezo.application.orchestration.backup.*
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import com.gonezo.expected.application.backup.ExpectedBackupSection
import com.gonezo.recurrence.application.backup.RecurrenceBackupSection

class ApplicationBackupJsonCodecTest {
    private val codec = ApplicationBackupJsonCodec()

    @Test
    fun `round trips typed sections and preserves split item category`() {
        val taxonomy = TaxonomyBackupSection(
            categories = listOf(BackupCategory("category-1", "Food", "expense", "active")),
            tags = listOf(BackupTag("tag-1", "Home", "active")),
        )
        val ledger = LedgerBackupSection(
            accounts = listOf(BackupAccount("account-1", "Main", "cash", "EUR", "active")),
            movements = listOf(BackupPostedMovement(
                "movement-1", "account-1", "expense", "posted", Instant.parse("2026-01-01T00:00:00Z"), "12.50", "EUR", null, null, "category-1", null,
                listOf(BackupSplitItem("item-1", "Lunch", "12.50", "EUR", null, "category-1")), listOf("tag-1"),
            )),
        )
        val document = ApplicationBackupDocument("gonezo-backup", 1, Instant.parse("2026-01-02T00:00:00Z"), mapOf(
            BackupSectionId.TAXONOMY to taxonomy,
            BackupSectionId.LEDGER to ledger,
            BackupSectionId.RECURRENCE to RecurrenceBackupSection(emptyList(), emptyList()),
            BackupSectionId.EXPECTED to ExpectedBackupSection(emptyList()),
            BackupSectionId.SHARING to SharingBackupSection(emptyList(), emptyList(), emptyList(), emptyList()),
            BackupSectionId.ANALYTICS to AnalyticsBackupSection(emptyList()),
            BackupSectionId.PREFERENCES to PreferencesBackupSection(null),
        ))

        val restored = codec.decode(codec.encode(document))

        assertThat((restored.sections.getValue(BackupSectionId.LEDGER) as LedgerBackupSection).movements.single().splitItems.single().categoryId)
            .isEqualTo("category-1")
        assertThat(codec.encode(document)).contains("\n  \"format\"")
    }

    @Test
    fun `rejects a section whose declared version does not match its typed payload`() {
        val json = """
            {"format":"gonezo-backup","formatVersion":1,"createdAt":"2026-01-01T00:00:00Z","sections":{"taxonomy":{"version":2,"data":{"categories":[],"tags":[]}},"ledger":{"version":1,"data":{"accounts":[],"movements":[]}},"recurrence":{"version":1,"data":{"movements":[],"occurrences":[]}},"expected":{"version":1,"data":{"movements":[]}},"sharing":{"version":1,"data":{"persons":[],"expenseShares":[],"recurringPlans":[],"plannedShares":[]}},"analytics":{"version":1,"data":{"exclusions":[]}},"preferences":{"version":1,"data":{}}}}
        """.trimIndent()

        assertThatThrownBy { codec.decode(json) }.isInstanceOf(BackupImportException::class.java)
            .extracting("code").isEqualTo(BackupErrorCode.UNSUPPORTED_SECTION_VERSION)
    }
}
