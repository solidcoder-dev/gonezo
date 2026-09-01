package com.gonezo.application.orchestration.backup

import com.gonezo.application.ConsistencyBoundary
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class ApplicationBackupCoordinatorTest {
    private val taxonomySection = object : BackupSection {
        override val sectionId = BackupSectionId.TAXONOMY
        override val version = 1
    }

    @Test
    fun `rejects unsupported root version before the consistency boundary`() {
        var entered = false
        val coordinator = ApplicationBackupCoordinator(
            exporters = emptySet(),
            importers = setOf(importer { entered = true }),
            consistencyBoundary = object : ConsistencyBoundary {
                override fun <T> withinConsistencyBoundary(block: () -> T): T { entered = true; return block() }
            },
        )

        assertThatThrownBy {
            coordinator.import(ApplicationBackupDocument("gonezo-backup", 2, Instant.EPOCH, mapOf(BackupSectionId.TAXONOMY to taxonomySection)), Instant.EPOCH)
        }.isInstanceOf(BackupImportException::class.java)
            .extracting("code").isEqualTo(BackupErrorCode.UNSUPPORTED_FORMAT_VERSION)
        assertThat(entered).isFalse()
    }

    @Test
    fun `validates every section before applying any section`() {
        val applied = mutableListOf<BackupSectionId>()
        val ledgerSection = object : BackupSection {
            override val sectionId = BackupSectionId.LEDGER
            override val version = 1
        }
        val coordinator = ApplicationBackupCoordinator(
            exporters = emptySet(),
            importers = setOf(
                importer { applied += BackupSectionId.TAXONOMY },
                object : BackupSectionImporter {
                    override val sectionId = BackupSectionId.LEDGER
                    override val supportedVersions = setOf(1)
                    override val dependencies = setOf(BackupSectionId.TAXONOMY)
                    override fun validate(section: BackupSection, context: BackupImportContext) = BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, "bad ledger")
                    override fun import(section: BackupSection, context: BackupImportContext) { applied += section.sectionId }
                },
            ),
        )

        assertThatThrownBy {
            coordinator.import(ApplicationBackupDocument("gonezo-backup", 1, Instant.EPOCH, mapOf(BackupSectionId.TAXONOMY to taxonomySection, BackupSectionId.LEDGER to ledgerSection)), Instant.EPOCH)
        }.isInstanceOf(BackupImportException::class.java)
        assertThat(applied).isEmpty()
    }

    @Test
    fun `resets portable state only after validation and before applying`() {
        val events = mutableListOf<String>()
        val coordinator = ApplicationBackupCoordinator(
            exporters = emptySet(),
            importers = setOf(importer { events += "import" }),
            consistencyBoundary = object : ConsistencyBoundary {
                override fun <T> withinConsistencyBoundary(block: () -> T): T {
                    events += "boundary"
                    return block()
                }
            },
            portableStateReset = PortableStateReset { events += "reset" },
        )

        coordinator.import(ApplicationBackupDocument("gonezo-backup", 1, Instant.EPOCH, mapOf(BackupSectionId.TAXONOMY to taxonomySection)), Instant.EPOCH)

        assertThat(events).containsExactly("boundary", "reset", "import")
    }

    private fun importer(action: () -> Unit) = object : BackupSectionImporter {
        override val sectionId = BackupSectionId.TAXONOMY
        override val supportedVersions = setOf(1)
        override val dependencies = emptySet<BackupSectionId>()
        override fun validate(section: BackupSection, context: BackupImportContext) = BackupValidationResult.Valid
        override fun import(section: BackupSection, context: BackupImportContext) = action()
    }
}
