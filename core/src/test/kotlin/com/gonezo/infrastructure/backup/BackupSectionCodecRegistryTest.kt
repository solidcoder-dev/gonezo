package com.gonezo.infrastructure.backup

import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.orchestration.backup.PreferencesBackupSection
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.assertj.core.api.Assertions.assertThat
import org.json.JSONObject
import org.junit.jupiter.api.Test

class BackupSectionCodecRegistryTest {
    @Test
    fun `rejects duplicate section and version registrations`() {
        val codec = PreferencesBackupSectionCodec()
        assertThatThrownBy { BackupSectionCodecRegistry(listOf(codec, codec)) }
            .hasMessageContaining("Duplicate")
    }

    @Test
    fun `rejects unknown section ids and unsupported versions explicitly`() {
        val registry = BackupSectionCodecRegistry(listOf(PreferencesBackupSectionCodec()))
        assertThatThrownBy { registry.decode(BackupSectionId.TAXONOMY, 1, JSONObject()) }
            .hasMessageContaining("Unsupported backup section")
        assertThatThrownBy { registry.decode(BackupSectionId.PREFERENCES, 2, JSONObject()) }
            .hasMessageContaining("Unsupported preferences backup version")
    }

    @Test
    fun `root codec delegates to a registered replacement codec without changes to root`() {
        val fake = object : BackupSectionCodec<PreferencesBackupSection> {
            override val sectionId = BackupSectionId.PREFERENCES
            override val supportedVersions = setOf(1)
            override fun encode(section: PreferencesBackupSection) = JSONObject().put("version", 1).put("data", JSONObject().put("defaultAccountId", "fake"))
            override fun decode(version: Int, data: JSONObject) = PreferencesBackupSection(data.getString("defaultAccountId"))
        }
        val registry = BackupSectionCodecRegistry(listOf(
            TaxonomyBackupSectionCodec(), LedgerBackupSectionCodec(), RecurrenceBackupSectionCodec(), ExpectedBackupSectionCodec(), SharingBackupSectionCodec(), AnalyticsBackupSectionCodec(), fake,
        ))
        val document = ApplicationBackupJsonCodec(registry).decode(ApplicationBackupJsonCodec(registry).encode(com.gonezo.application.backup.contract.ApplicationBackupDocument("gonezo-backup", 1, java.time.Instant.parse("2026-01-01T00:00:00Z"), mapOf(
            BackupSectionId.TAXONOMY to com.gonezo.application.orchestration.backup.TaxonomyBackupSection(emptyList(), emptyList()),
            BackupSectionId.LEDGER to com.gonezo.application.orchestration.backup.LedgerBackupSection(emptyList(), emptyList()),
            BackupSectionId.RECURRENCE to com.gonezo.recurrence.application.backup.RecurrenceBackupSection(emptyList(), emptyList()),
            BackupSectionId.EXPECTED to com.gonezo.expected.application.backup.ExpectedBackupSection(emptyList()),
            BackupSectionId.SHARING to com.gonezo.application.orchestration.backup.SharingBackupSection(emptyList(), emptyList(), emptyList(), emptyList()),
            BackupSectionId.ANALYTICS to com.gonezo.application.orchestration.backup.AnalyticsBackupSection(emptyList()),
            BackupSectionId.PREFERENCES to com.gonezo.application.orchestration.backup.PreferencesBackupSection("fake"),
        ))))
        assertThat(document.sections.getValue(BackupSectionId.PREFERENCES)).isEqualTo(PreferencesBackupSection("fake"))
    }
}
