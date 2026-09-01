package com.gonezo.application.orchestration.backup

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class BackupSectionDependencyResolverTest {
    @Test
    fun `orders importers by declared dependencies`() {
        val importers = listOf(
            fake(BackupSectionId.SHARING, setOf(BackupSectionId.LEDGER)),
            fake(BackupSectionId.LEDGER, setOf(BackupSectionId.TAXONOMY)),
            fake(BackupSectionId.TAXONOMY),
        )

        assertThat(BackupSectionDependencyResolver.resolve(importers).map { it.sectionId })
            .containsExactly(BackupSectionId.TAXONOMY, BackupSectionId.LEDGER, BackupSectionId.SHARING)
    }

    @Test
    fun `rejects dependency cycles`() {
        assertThatThrownBy {
            BackupSectionDependencyResolver.resolve(listOf(
                fake(BackupSectionId.TAXONOMY, setOf(BackupSectionId.LEDGER)),
                fake(BackupSectionId.LEDGER, setOf(BackupSectionId.TAXONOMY)),
            ))
        }.isInstanceOf(BackupDependencyException::class.java)
    }

    private fun fake(id: BackupSectionId, dependencies: Set<BackupSectionId> = emptySet()) = object : BackupSectionImporter {
        override val sectionId = id
        override val supportedVersions = setOf(1)
        override val dependencies = dependencies
        override fun validate(section: BackupSection, context: BackupImportContext) = BackupValidationResult.Valid
        override fun import(section: BackupSection, context: BackupImportContext) = Unit
    }
}
