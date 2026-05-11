package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.application.orchestration.backup.ImportMovementsBackupCommand
import com.gonezo.application.orchestration.backup.ImportMovementsBackupResult
import com.gonezo.application.orchestration.backup.ImportMovementsBackupService
import com.gonezo.infrastructure.backup.MovementsBackupJsonParser
import java.time.Instant

class AndroidMovementsBackupCore private constructor(context: Context) {
  private val parser = MovementsBackupJsonParser()
  private val importBackupService: ImportMovementsBackupService

  init {
    val database = CoreDatabase(context.applicationContext)
    importBackupService = ImportMovementsBackupService(
      accountRepository = AndroidLedgerAccountRepository(database),
      transactionRepository = AndroidLedgerTransactionRepository(database),
      categoryRepository = AndroidTaxonomyCategoryRepository(database),
      tagRepository = AndroidTaxonomyTagRepository(database),
      categoryAssignmentRepository = AndroidTaxonomyTransactionCategoryAssignmentRepository(database),
      tagAssignmentRepository = AndroidTaxonomyTransactionTagAssignmentRepository(database),
      consistencyBoundary = AndroidConsistencyBoundary(database),
    )
  }

  fun importBackup(bytes: ByteArray): ImportMovementsBackupResult {
    val snapshot = parser.parse(bytes.toString(Charsets.UTF_8))
    return importBackupService.execute(
      ImportMovementsBackupCommand(
        snapshot = snapshot,
        importedAt = Instant.now(),
      ),
    )
  }

  companion object {
    @Volatile
    private var instance: AndroidMovementsBackupCore? = null

    @JvmStatic
    fun getInstance(context: Context): AndroidMovementsBackupCore =
      instance ?: synchronized(this) {
        instance ?: AndroidMovementsBackupCore(context).also { instance = it }
      }
  }
}
