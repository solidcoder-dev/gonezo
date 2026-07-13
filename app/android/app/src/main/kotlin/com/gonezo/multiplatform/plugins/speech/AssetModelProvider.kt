package com.gonezo.multiplatform.plugins.speech

import android.content.Context
import java.io.File
import java.security.MessageDigest

class AssetModelProvider(
    private val context: Context,
    private val assetPath: String,
    private val expectedSize: Long,
    private val expectedSha256: String,
) : ModelProvider {
  @Volatile
  private var cachedPath: String? = null

  @Synchronized
  override fun modelPath(): String {
    cachedPath?.let { return it }
    require(assetPath.isNotBlank()) { "speech model asset path is required" }
    val target = File(context.noBackupFilesDir, assetPath.substringAfterLast('/'))
    if (!target.isFile || target.length() != expectedSize || sha256(target) != expectedSha256) {
      if (target.exists()) target.delete()
      context.assets.open(assetPath).use { input ->
        target.outputStream().use { output -> input.copyTo(output) }
      }
    }
    if (!target.isFile || target.length() != expectedSize || sha256(target) != expectedSha256) {
      error("speech model asset failed integrity validation")
    }
    return target.absolutePath.also { cachedPath = it }
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
      val buffer = ByteArray(1024 * 1024)
      var read = input.read(buffer)
      while (read >= 0) {
        if (read > 0) digest.update(buffer, 0, read)
        read = input.read(buffer)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }
}
