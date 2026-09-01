package com.gonezo.infrastructure.backup

import com.gonezo.application.backup.contract.BackupErrorCode
import com.gonezo.application.backup.contract.BackupImportException
import com.gonezo.application.backup.contract.BackupSection
import com.gonezo.application.backup.contract.BackupSectionId
import org.json.JSONObject

class BackupSectionCodecRegistry(codecs: Collection<BackupSectionCodec<*>>) {
    private val codecsByKey: Map<Pair<BackupSectionId, Int>, BackupSectionCodec<*>>

    init {
        val entries = codecs.flatMap { codec -> codec.supportedVersions.map { version -> (codec.sectionId to version) to codec } }
        if (entries.size != entries.map { it.first }.toSet().size) throw IllegalArgumentException("Duplicate backup section codec registration")
        codecsByKey = entries.toMap()
    }

    fun encode(section: BackupSection): JSONObject = encodeWith(resolve(section.sectionId, section.version), section)
    fun decode(id: BackupSectionId, version: Int, data: JSONObject): BackupSection = decodeWith(resolve(id, version), version, data)
    fun registeredSectionIds(): Set<BackupSectionId> = codecsByKey.keys.mapTo(mutableSetOf()) { it.first }

    private fun resolve(id: BackupSectionId, version: Int): BackupSectionCodec<*> = codecsByKey[id to version]
        ?: if (codecsByKey.keys.none { it.first == id }) {
            throw BackupImportException(BackupErrorCode.UNSUPPORTED_SECTION, "Unsupported backup section: ${id.value}")
        } else {
            throw BackupImportException(BackupErrorCode.UNSUPPORTED_SECTION_VERSION, "Unsupported ${id.value} backup version: $version")
        }

    @Suppress("UNCHECKED_CAST")
    private fun encodeWith(codec: BackupSectionCodec<*>, section: BackupSection): JSONObject = (codec as BackupSectionCodec<BackupSection>).encode(section)

    @Suppress("UNCHECKED_CAST")
    private fun decodeWith(codec: BackupSectionCodec<*>, version: Int, data: JSONObject): BackupSection = (codec as BackupSectionCodec<BackupSection>).decode(version, data)
}

fun defaultBackupSectionCodecRegistry(): BackupSectionCodecRegistry = BackupSectionCodecRegistry(
    listOf(TaxonomyBackupSectionCodec(), LedgerBackupSectionCodec(), RecurrenceBackupSectionCodec(), ExpectedBackupSectionCodec(), SharingBackupSectionCodec(), AnalyticsBackupSectionCodec(), PreferencesBackupSectionCodec()),
)
