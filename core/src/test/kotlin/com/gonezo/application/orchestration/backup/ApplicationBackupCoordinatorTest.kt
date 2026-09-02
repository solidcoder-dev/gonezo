package com.gonezo.application.orchestration.backup

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.backup.contract.ApplicationBackupDocument
import com.gonezo.application.backup.contract.BackupErrorCode
import com.gonezo.application.backup.contract.BackupFormatDescriptor
import com.gonezo.application.backup.contract.BackupImportContext
import com.gonezo.application.backup.contract.BackupImportException
import com.gonezo.application.backup.contract.BackupReference
import com.gonezo.application.backup.contract.BackupSection
import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.backup.contract.BackupSectionImporter
import com.gonezo.application.backup.contract.BackupValidationResult
import com.gonezo.application.backup.contract.PortableStateReset
import com.gonezo.application.backup.contract.RegisteredBackupFormatRegistry
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class ApplicationBackupCoordinatorTest {
    private val taxonomyOnlyFormatRegistry = RegisteredBackupFormatRegistry(
        listOf(BackupFormatDescriptor(1, setOf(BackupSectionId.TAXONOMY))),
    )
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
                override fun <T> withinConsistencyBoundary(block: () -> T): T {
                    entered = true
                    return block()
                }
            },
            formatRegistry = taxonomyOnlyFormatRegistry,
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
                    override fun import(section: BackupSection, context: BackupImportContext) {
                        applied += section.sectionId
                    }
                },
            ),
            formatRegistry = RegisteredBackupFormatRegistry(listOf(BackupFormatDescriptor(1, setOf(BackupSectionId.TAXONOMY, BackupSectionId.LEDGER)))),
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
            formatRegistry = taxonomyOnlyFormatRegistry,
        )

        coordinator.import(ApplicationBackupDocument("gonezo-backup", 1, Instant.EPOCH, mapOf(BackupSectionId.TAXONOMY to taxonomySection)), Instant.EPOCH)

        assertThat(events).containsExactly("boundary", "reset", "import")
    }

    @Test
    fun `rejects duplicate identifiers before resetting existing state`() {
        var reset = false
        val invalidSection = object : BackupSection {
            override val sectionId = BackupSectionId.TAXONOMY
            override val version = 1
            override fun references() = listOf(
                BackupReference.Category("category-1"),
                BackupReference.Category("category-1"),
            )
        }
        val coordinator = ApplicationBackupCoordinator(
            exporters = emptySet(),
            importers = setOf(importer { error("must not import") }),
            portableStateReset = PortableStateReset { reset = true },
            formatRegistry = taxonomyOnlyFormatRegistry,
        )

        assertThatThrownBy {
            coordinator.import(ApplicationBackupDocument("gonezo-backup", 1, Instant.EPOCH, mapOf(BackupSectionId.TAXONOMY to invalidSection)), Instant.EPOCH)
        }.isInstanceOf(BackupImportException::class.java)
            .extracting("code").isEqualTo(BackupErrorCode.INVALID_DATA)
        assertThat(reset).isFalse()
    }

    private fun importer(action: () -> Unit) = object : BackupSectionImporter {
        override val sectionId = BackupSectionId.TAXONOMY
        override val supportedVersions = setOf(1)
        override val dependencies = emptySet<BackupSectionId>()
        override fun validate(section: BackupSection, context: BackupImportContext) = BackupValidationResult.Valid
        override fun import(section: BackupSection, context: BackupImportContext) = action()
    }
}
