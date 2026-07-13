package com.gonezo.multiplatform.plugins.interpretation.export

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException

@CapacitorPlugin(name = "InterpretationRunExportPlugin")
class InterpretationRunExportPlugin : Plugin() {
  private lateinit var archiveBuilder: PrivateInterpretationRunZipBuilder
  private val exportFileCopier = InterpretationRunExportFileCopier()
  private var pendingExport: PendingExport? = null

  override fun load() {
    archiveBuilder = PrivateInterpretationRunZipBuilder(
      baseDirectory = context.noBackupFilesDir,
      cacheDirectory = context.cacheDir,
    )
    archiveBuilder.cleanupTemporaryArtifacts()
  }

  override fun handleOnDestroy() {
    cleanupPendingExport()
    archiveBuilder.cleanupTemporaryArtifacts()
    super.handleOnDestroy()
  }

  @PluginMethod
  fun exportRun(call: PluginCall) {
    val runId = call.getString("runId")?.trim()
    val suggestedFileName = call.getString("suggestedFileName")?.trim().takeUnless { it.isNullOrBlank() }
      ?: "gonezo-voice-run-${runId ?: "unknown"}.zip"

    if (runId.isNullOrEmpty()) {
      rejectExportFailure(call, "Diagnostic export failed.", recoverable = false)
      return
    }

    if (pendingExport != null) {
      rejectExportFailure(call, "Diagnostic export is already in progress.", recoverable = true)
      return
    }

    val archiveFile = try {
      archiveBuilder.build(runId)
    } catch (exception: FileNotFoundException) {
      reject(call, "run-not-found", exception.message ?: "Interpretation run was not found.", false)
      return
    } catch (exception: IllegalArgumentException) {
      rejectExportFailure(call, exception.message ?: "Diagnostic export failed.", recoverable = false)
      return
    } catch (exception: IOException) {
      rejectExportFailure(call, exception.message ?: "Diagnostic export failed.", recoverable = true)
      return
    }

    pendingExport = PendingExport(
      call = call,
      runId = runId,
      suggestedFileName = suggestedFileName,
      archiveFile = archiveFile,
    )

    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "application/zip"
      putExtra(Intent.EXTRA_TITLE, suggestedFileName)
    }
    startActivityForResult(call, intent, "handleExportResult")
  }

  @ActivityCallback
  fun handleExportResult(call: PluginCall?, result: ActivityResult) {
    val pending = pendingExport
    pendingExport = null

    if (pending == null) {
      call?.resolve(cancellationPayload())
      return
    }

    try {
      if (result.resultCode != Activity.RESULT_OK) {
        resolveCancelled(call ?: pending.call)
        return
      }

      val destination = result.data?.data ?: throw IOException("Unable to resolve export destination.")
      exportFileCopier.copy(
        archiveFile = pending.archiveFile,
        destination = destination,
        openOutputStream = { uri: Uri -> context.contentResolver.openOutputStream(uri) },
      )
      resolveSuccess(call ?: pending.call, pending.suggestedFileName)
    } catch (exception: IOException) {
      reject(call ?: pending.call, "export-failed", exception.message ?: "Diagnostic export failed.", true)
    } finally {
      pending.archiveFile.delete()
    }
  }

  private fun cleanupPendingExport() {
    pendingExport?.archiveFile?.delete()
    pendingExport = null
  }

  private fun resolveCancelled(call: PluginCall) {
    call.resolve(cancellationPayload())
  }

  private fun resolveSuccess(call: PluginCall, fileName: String) {
    call.resolve(JSObject().apply {
      put("kind", "success")
      put("fileName", fileName)
    })
  }

  private fun cancellationPayload(): JSObject {
    return JSObject().apply {
      put("kind", "cancelled")
    }
  }

  private fun rejectExportFailure(call: PluginCall, message: String, recoverable: Boolean) {
    reject(call, "export-failed", message, recoverable)
  }

  private fun reject(call: PluginCall, code: String, message: String, recoverable: Boolean) {
    call.reject(message, code, JSObject().put("recoverable", recoverable))
  }

  private data class PendingExport(
    val call: PluginCall,
    val runId: String,
    val suggestedFileName: String,
    val archiveFile: File,
  )
}
