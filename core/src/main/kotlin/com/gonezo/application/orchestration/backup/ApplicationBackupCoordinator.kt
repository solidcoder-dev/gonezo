package com.gonezo.application.orchestration.backup

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.application.backup.contract.*
import com.gonezo.application.backup.contract.ApplicationBackupDocument
import com.gonezo.application.backup.contract.BackupDependencyException
import com.gonezo.application.backup.contract.BackupErrorCode
import com.gonezo.application.backup.contract.BackupImportContext
import com.gonezo.application.backup.contract.BackupImportException
import com.gonezo.application.backup.contract.BackupSection
import com.gonezo.application.backup.contract.BackupSectionDependencyResolver
import com.gonezo.application.backup.contract.BackupSectionExporter
import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.backup.contract.BackupSectionImporter
import com.gonezo.application.backup.contract.BackupValidationResult
import com.gonezo.application.backup.contract.PortableStateReset
import java.time.Instant

class ApplicationBackupCoordinator(private val exporters: Set<BackupSectionExporter>, private val importers: Set<BackupSectionImporter>, private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary, private val portableStateReset: PortableStateReset = PortableStateReset { }, private val formatRegistry: BackupFormatRegistry = currentBackupFormatRegistry()) {
    fun export(createdAt: Instant): ApplicationBackupDocument {
        val exporterById = exporters.associateBy { it.sectionId }
        require(exporterById.size == exporters.size) { "Duplicate backup section exporter" }
        val sections = exporterById.values.sortedBy { it.sectionId.name }.associate { exporter ->
            val section = exporter.export()
            require(section.sectionId == exporter.sectionId) { "Backup exporter returned the wrong section" }
            require(section.version == exporter.version) { "Backup exporter returned the wrong version" }
            exporter.sectionId to section
        }
        val format = formatRegistry.resolve(ROOT_VERSION)
        require(format.requiredSections == sections.keys) { "Backup exporters do not match the current backup format" }
        return ApplicationBackupDocument(FORMAT, format.version, createdAt, sections)
    }

    fun import(document: ApplicationBackupDocument, importedAt: Instant) {
        validateRoot(document)
        val orderedImporters = try {
            BackupSectionDependencyResolver.resolve(importers)
        } catch (error: BackupDependencyException) {
            throw BackupImportException(BackupErrorCode.DEPENDENCY_ERROR, error.message ?: "Invalid backup dependency graph", error)
        }
        val context = BackupImportContext(importedAt, document.sections)
        BackupIdentifierValidator.validate(document.sections)
        orderedImporters.forEach { importer ->
            val section = document.sections[importer.sectionId]
                ?: throw BackupImportException(BackupErrorCode.MISSING_SECTION, "Missing backup section: ${importer.sectionId}")
            if (section.version !in importer.supportedVersions) {
                throw BackupImportException(BackupErrorCode.UNSUPPORTED_SECTION_VERSION, "Unsupported ${importer.sectionId} backup version: ${section.version}")
            }
            when (val validation = importer.validate(section, context)) {
                BackupValidationResult.Valid -> Unit
                is com.gonezo.application.backup.contract.BackupValidationResult.Invalid -> throw BackupImportException(validation.code, validation.message)
            }
        }
        try {
            consistencyBoundary.withinConsistencyBoundary {
                portableStateReset.reset()
                orderedImporters.forEach { importer ->
                    importer.import(document.sections.getValue(importer.sectionId), context)
                }
            }
        } catch (error: BackupImportException) {
            throw error
        } catch (error: Exception) {
            throw BackupImportException(BackupErrorCode.IMPORT_FAILED, "Application backup restore failed", error)
        }
    }

    private fun validateRoot(document: ApplicationBackupDocument) {
        if (document.format != FORMAT) throw BackupImportException(BackupErrorCode.INVALID_FORMAT, "Unsupported backup format: ${document.format}")
        val descriptor = formatRegistry.resolve(document.formatVersion)
        val required = descriptor.requiredSections
        val missing = required - document.sections.keys
        if (missing.isNotEmpty()) throw BackupImportException(BackupErrorCode.MISSING_SECTION, "Missing backup sections: ${missing.joinToString()}")
        val unknown = document.sections.keys - descriptor.supportedSections
        if (unknown.isNotEmpty()) throw BackupImportException(BackupErrorCode.UNSUPPORTED_SECTION, "Unsupported backup sections: ${unknown.joinToString()}")
    }

    companion object {
        const val FORMAT = "gonezo-backup"
        const val ROOT_VERSION = 1
    }
}
