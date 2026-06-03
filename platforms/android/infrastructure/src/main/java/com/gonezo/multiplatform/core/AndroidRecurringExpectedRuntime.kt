package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.ledger.domain.AccountId
import java.time.Clock
import java.util.UUID

class AndroidRecurringExpectedRuntime private constructor(
  private val coordinator: AndroidRecurringExpectedCoordinator,
) {
  fun projectNext(recurringMovementId: String) {
    coordinator.projectNext(recurringMovementId)
  }

  fun continueAfterResolution(expectedMovementId: String, transactionId: String, resolvedAt: String) {
    coordinator.continueAfterResolution(expectedMovementId, transactionId, resolvedAt)
  }

  fun continueAfterDismissal(expectedMovementId: String, dismissedAt: String) {
    coordinator.continueAfterDismissal(expectedMovementId, dismissedAt)
  }

  companion object {
    @Volatile
    private var instance: AndroidRecurringExpectedRuntime? = null

    @JvmStatic
    fun getInstance(context: Context): AndroidRecurringExpectedRuntime {
      val existing = instance
      if (existing != null) {
        return existing
      }
      return synchronized(this) {
        val synchronizedExisting = instance
        if (synchronizedExisting != null) {
          synchronizedExisting
        } else {
          val database = CoreDatabase(context.applicationContext)
          val accountRepository = AndroidLedgerAccountRepository(database)
          val clock = Clock.systemUTC()
          val expectedCore = AndroidExpectedCore(
            database = database,
            accountExists = { accountId ->
              val uuid = runCatching { UUID.fromString(accountId.trim()) }.getOrNull()
              uuid != null && accountRepository.exists(AccountId(uuid))
            },
            clock = clock,
          )
          AndroidRecurringExpectedRuntime(
            coordinator = AndroidRecurringExpectedCoordinator(
              recurringMovementRepository = AndroidRecurringMovementRepository(database),
              store = AndroidRecurringExpectedSqliteStore(database, expectedCore),
              clock = clock,
              consistencyBoundary = AndroidConsistencyBoundary(database),
            ),
          ).also { created -> instance = created }
        }
      }
    }
  }
}
