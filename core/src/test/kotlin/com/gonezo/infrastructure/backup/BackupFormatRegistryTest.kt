package com.gonezo.infrastructure.backup

import com.gonezo.application.backup.contract.BackupErrorCode
import com.gonezo.application.backup.contract.BackupFormatDescriptor
import com.gonezo.application.backup.contract.BackupImportException
import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.backup.contract.RegisteredBackupFormatRegistry
import com.gonezo.application.backup.contract.currentBackupFormatRegistry
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class BackupFormatRegistryTest {
    @Test
    fun `version one preserves the historical portable section set`() {
        assertThat(currentBackupFormatRegistry().resolve(1).requiredSections).containsExactlyInAnyOrder(
            BackupSectionId.TAXONOMY,
            BackupSectionId.LEDGER,
            BackupSectionId.RECURRENCE,
            BackupSectionId.EXPECTED,
            BackupSectionId.SHARING,
            BackupSectionId.ANALYTICS,
            BackupSectionId.PREFERENCES,
        )
    }

    @Test
    fun `unknown root format versions fail explicitly`() {
        assertThatThrownBy { currentBackupFormatRegistry().resolve(99) }
            .isInstanceOf(BackupImportException::class.java)
            .extracting("code").isEqualTo(BackupErrorCode.UNSUPPORTED_FORMAT_VERSION)
    }

    @Test
    fun `historical required sections do not come from current codec registrations`() {
        val registry = BackupSectionCodecRegistry(listOf(PreferencesBackupSectionCodec()))

        assertThat(currentBackupFormatRegistry().resolve(1).requiredSections)
            .contains(BackupSectionId.TAXONOMY)
        assertThat(registry.registeredSectionIds()).containsExactly(BackupSectionId.PREFERENCES)
    }

    @Test
    fun `an arbitrary section id is a valid extension without central enum changes`() {
        val budgets = BackupSectionId("budgets")
        val descriptor = BackupFormatDescriptor(2, setOf(budgets))

        assertThat(RegisteredBackupFormatRegistry(listOf(descriptor)).resolve(2).requiredSections)
            .containsExactly(budgets)
    }
}
