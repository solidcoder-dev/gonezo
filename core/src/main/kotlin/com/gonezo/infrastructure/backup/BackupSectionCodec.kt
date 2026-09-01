package com.gonezo.infrastructure.backup

import com.gonezo.application.backup.contract.BackupSection
import com.gonezo.application.backup.contract.BackupSectionId
import org.json.JSONObject

interface BackupSectionCodec<T : BackupSection> {
    val sectionId: BackupSectionId
    val supportedVersions: Set<Int>
    fun encode(section: T): JSONObject
    fun decode(version: Int, data: JSONObject): T
}
