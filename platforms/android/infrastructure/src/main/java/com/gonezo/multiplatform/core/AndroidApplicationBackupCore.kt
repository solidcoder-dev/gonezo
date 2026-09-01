package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.application.backup.contract.PortableStateReset
import com.gonezo.infrastructure.backup.ApplicationBackupJsonCodec
import com.gonezo.infrastructure.backup.defaultBackupSectionCodecRegistry
import com.gonezo.preferences.domain.PreferencesOwnerId
import java.time.Instant

class AndroidApplicationBackupCore private constructor(context: Context) {
  private val database = CoreDatabase(context.applicationContext)
  private val codec = ApplicationBackupJsonCodec(defaultBackupSectionCodecRegistry())
  private val boundary = AndroidConsistencyBoundary(database)
  private val composition = ApplicationBackupComposition(
    categoryRepository = AndroidTaxonomyCategoryRepository(database),
    tagRepository = AndroidTaxonomyTagRepository(database),
    accountRepository = AndroidLedgerAccountRepository(database),
    transactionRepository = AndroidLedgerTransactionRepository(database),
    categoryAssignmentRepository = AndroidTaxonomyTransactionCategoryAssignmentRepository(database),
    tagAssignmentRepository = AndroidTaxonomyTransactionTagAssignmentRepository(database),
    recurringMovementRepository = AndroidRecurringMovementRepository(database),
    recurringOccurrenceRepository = AndroidRecurringMovementOccurrenceRepository(database),
    expectedMovementRepository = AndroidExpectedMovementRepository(database),
    sharingPersonRepository = AndroidSharingPersonRepository(database),
    expenseShareRepository = AndroidExpenseShareRepository(database),
    recurringPlanRepository = AndroidRecurringSharePlanRepository(database),
    plannedShareRepository = AndroidPlannedExpenseShareRepository(database),
    analyticsExclusionRepository = AndroidAnalyticsExclusionRepository(database),
    preferencesRepository = AndroidUserPreferencesRepository(database),
    preferencesOwnerId = PreferencesOwnerId.LOCAL_USER,
    consistencyBoundary = boundary,
    portableStateReset = PortableStateReset { database.clearPortableState() },
  )

  fun exportJson(): String = codec.encode(composition.export(Instant.now()))

  fun importJson(json: String) {
    val document = codec.decode(json)
    composition.import(document, Instant.now())
  }

  companion object {
    @Volatile private var instance: AndroidApplicationBackupCore? = null
    @JvmStatic fun getInstance(context: Context): AndroidApplicationBackupCore = instance ?: synchronized(this) {
      instance ?: AndroidApplicationBackupCore(context).also { instance = it }
    }
  }
}
