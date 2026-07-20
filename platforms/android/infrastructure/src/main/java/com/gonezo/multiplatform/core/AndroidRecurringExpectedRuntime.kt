package com.gonezo.multiplatform.core

import android.content.Context
import java.time.Instant

class AndroidRecurringExpectedRuntime private constructor(
  private val application: AndroidExpectedPostingApplication,
) {
  fun projectNext(recurringMovementId: String) {
    application.projectNext(recurringMovementId)
  }

  fun continueAfterResolution(expectedMovementId: String, transactionId: String, resolvedAt: String) {
    application.resolve(expectedMovementId, transactionId, Instant.parse(resolvedAt))
  }

  fun continueAfterDismissal(expectedMovementId: String, dismissedAt: String) {
    application.dismiss(expectedMovementId, Instant.parse(dismissedAt))
  }

  companion object {
    @Volatile private var instance: AndroidRecurringExpectedRuntime? = null

    @JvmStatic
    fun getInstance(context: Context): AndroidRecurringExpectedRuntime = instance ?: synchronized(this) {
      instance ?: AndroidRecurringExpectedRuntime(AndroidExpectedPostingApplication.getInstance(context)).also { instance = it }
    }
  }
}
