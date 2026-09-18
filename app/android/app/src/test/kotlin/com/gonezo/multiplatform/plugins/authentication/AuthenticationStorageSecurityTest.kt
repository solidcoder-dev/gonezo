package com.gonezo.multiplatform.plugins.authentication

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticationStorageSecurityTest {
  @Test
  fun `excludes keystore encrypted authentication storage from Android backups`() {
    val manifest = File("src/main/AndroidManifest.xml").readText()
    val backupRules = File("src/main/res/xml/backup_rules.xml").readText()
    val extractionRules = File("src/main/res/xml/data_extraction_rules.xml").readText()

    assertTrue(manifest.contains("android:fullBackupContent=\"@xml/backup_rules\""))
    assertTrue(manifest.contains("android:dataExtractionRules=\"@xml/data_extraction_rules\""))
    assertTrue(backupRules.contains("path=\"gonezo.authentication.secure.v1.xml\""))
    assertTrue(extractionRules.contains("path=\"gonezo.authentication.secure.v1.xml\""))
  }
}
