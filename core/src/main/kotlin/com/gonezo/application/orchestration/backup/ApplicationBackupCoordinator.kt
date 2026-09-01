package com.gonezo.application.orchestration.backup

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import java.time.Instant

class ApplicationBackupCoordinator(
    private val exporters: Set<BackupSectionExporter>,
    private val importers: Set<BackupSectionImporter>,
    private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
    private val portableStateReset: PortableStateReset = PortableStateReset { },
) {
    fun export(createdAt: Instant): ApplicationBackupDocument {
        val exporterById = exporters.associateBy { it.sectionId }
        require(exporterById.size == exporters.size) { "Duplicate backup section exporter" }
        val sections = exporterById.values.sortedBy { it.sectionId.name }.associate { exporter ->
            val section = exporter.export()
            require(section.sectionId == exporter.sectionId) { "Backup exporter returned the wrong section" }
            require(section.version == exporter.version) { "Backup exporter returned the wrong version" }
            exporter.sectionId to section
        }
        return ApplicationBackupDocument(FORMAT, ROOT_VERSION, createdAt, sections)
    }

    fun import(document: ApplicationBackupDocument, importedAt: Instant) {
        validateRoot(document)
        val orderedImporters = try {
            BackupSectionDependencyResolver.resolve(importers)
        } catch (error: BackupDependencyException) {
            throw BackupImportException(BackupErrorCode.DEPENDENCY_ERROR, error.message ?: "Invalid backup dependency graph", error)
        }
        val context = BackupImportContext(importedAt, document.sections)
        orderedImporters.forEach { importer ->
            val section = document.sections[importer.sectionId]
                ?: throw BackupImportException(BackupErrorCode.MISSING_SECTION, "Missing backup section: ${importer.sectionId}")
            if (section.version !in importer.supportedVersions) {
                throw BackupImportException(BackupErrorCode.UNSUPPORTED_SECTION_VERSION, "Unsupported ${importer.sectionId} backup version: ${section.version}")
            }
            when (val validation = importer.validate(section, context)) {
                BackupValidationResult.Valid -> Unit
                is BackupValidationResult.Invalid -> throw BackupImportException(validation.code, validation.message)
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
        if (document.formatVersion != ROOT_VERSION) throw BackupImportException(BackupErrorCode.UNSUPPORTED_FORMAT_VERSION, "Unsupported backup format version: ${document.formatVersion}")
        val required = importers.map { it.sectionId }.toSet()
        val missing = required - document.sections.keys
        if (missing.isNotEmpty()) throw BackupImportException(BackupErrorCode.MISSING_SECTION, "Missing backup sections: ${missing.joinToString()}")
    }

    companion object {
        const val FORMAT = "gonezo-backup"
        const val ROOT_VERSION = 1
    }
}

class BackupImportException(
    val code: BackupErrorCode,
    override val message: String,
    cause: Throwable? = null,
) : IllegalArgumentException(message, cause)
