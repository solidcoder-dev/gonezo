package com.gonezo.infrastructure.backup

import com.gonezo.application.backup.contract.ApplicationBackupDocument
import com.gonezo.application.backup.contract.BackupErrorCode
import com.gonezo.application.backup.contract.BackupImportException
import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.backup.contract.BackupFormatRegistry
import com.gonezo.application.backup.contract.currentBackupFormatRegistry
import org.json.JSONObject
import java.time.Instant

class ApplicationBackupJsonCodec(
    private val sectionCodecs: BackupSectionCodecRegistry = defaultBackupSectionCodecRegistry(),
    private val formatRegistry: BackupFormatRegistry = currentBackupFormatRegistry(),
) {
    fun encode(document: ApplicationBackupDocument): String = JSONObject()
        .put("format", document.format)
        .put("formatVersion", document.formatVersion)
        .put("createdAt", document.createdAt.toString())
        .put("sections", JSONObject().apply {
            document.sections.toSortedMap(compareBy { it.name }).forEach { (id, section) -> put(id.jsonName(), sectionCodecs.encode(section)) }
        }).toString(2)

    fun decode(json: String): ApplicationBackupDocument = try {
        val root = JSONObject(json)
        val format = root.getString("format")
        val formatVersion = root.getInt("formatVersion")
        if (format != FORMAT) throw BackupImportException(BackupErrorCode.INVALID_FORMAT, "Unsupported backup format: $format")
        val descriptor = formatRegistry.resolve(formatVersion)
        val sectionsObject = root.getJSONObject("sections")
        val actualSectionIds = sectionsObject.keySet().map(::BackupSectionId).toSet()
        val missing = descriptor.requiredSections - actualSectionIds
        if (missing.isNotEmpty()) throw BackupImportException(BackupErrorCode.MISSING_SECTION, "Missing backup sections: ${missing.joinToString()}")
        val unknown = actualSectionIds - descriptor.supportedSections
        if (unknown.isNotEmpty()) throw BackupImportException(BackupErrorCode.UNSUPPORTED_SECTION, "Unsupported backup section: ${unknown.joinToString()}")
        val sections = actualSectionIds.sortedBy { it.name }.associateWith { id ->
            val section = sectionsObject.getJSONObject(id.jsonName())
            sectionCodecs.decode(id, section.getInt("version"), section.getJSONObject("data"))
        }
        ApplicationBackupDocument(format, formatVersion, Instant.parse(root.getString("createdAt")), sections)
    } catch (error: BackupImportException) {
        throw error
    } catch (error: Exception) {
        throw BackupImportException(BackupErrorCode.INVALID_FORMAT, "Invalid application backup JSON: ${error.message}", error)
    }

    private fun BackupSectionId.jsonName() = name.lowercase()

    companion object {
        const val FORMAT = "gonezo-backup"
        const val VERSION = 1
    }
}
