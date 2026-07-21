package com.gonezo.multiplatform.core

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.gonezo.application.orchestration.CategorizationStatus
import com.gonezo.application.orchestration.TxCategorizationState
import com.gonezo.taxonomy.domain.CategoryId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class AndroidCategorizationStateRepositoryInstrumentedTest {
  @Test
  fun supportsEmptyLookupUpsertUpdatePendingAndTargetedDelete() {
    val database = CoreDatabase(ApplicationProvider.getApplicationContext(), "gonezo-categorization-${System.nanoTime()}.db")
    val repository = AndroidCategorizationStateRepository(database)
    val firstId = UUID.fromString("00000000-0000-4000-8000-000000000301")
    val secondId = UUID.fromString("00000000-0000-4000-8000-000000000302")
    val initial = state(firstId, CategorizationStatus.PENDING, 1)
    val updated = state(firstId, CategorizationStatus.FAILED, 2)
    val pending = state(secondId, CategorizationStatus.PENDING, 1)

    assertNull(repository.findByTransactionId(firstId))
    repository.upsert(initial)
    assertEquals(initial, repository.findByTransactionId(firstId))
    repository.upsert(updated)
    assertEquals(updated, repository.findByTransactionId(firstId))
    repository.upsert(pending)
    assertEquals(listOf(secondId), repository.findPending(Instant.parse("2026-07-02T00:00:00Z"), 10).map { it.transactionId })

    repository.deleteByTransactionIds(listOf(firstId))
    assertNull(repository.findByTransactionId(firstId))
    assertEquals(pending, repository.findByTransactionId(secondId))
    database.close()
  }

  @Test
  fun consistencyBoundaryRollsBackWritesWhenTheOperationFails() {
    val database = CoreDatabase(ApplicationProvider.getApplicationContext(), "gonezo-boundary-${System.nanoTime()}.db")
    val boundary = AndroidConsistencyBoundary(database)
    val sqlite = database.writableDatabase

    assertThrows(IllegalStateException::class.java) {
      boundary.withinConsistencyBoundary {
        sqlite.execSQL("insert into user_preferences(owner_id, default_account_id, updated_at) values ('owner-rollback', null, '2026-07-01T00:00:00Z')")
        throw IllegalStateException("forced failure")
      }
    }

    assertEquals(0, sqlite.rawQuery("select count(*) from user_preferences where owner_id = 'owner-rollback'", null).use { it.moveToFirst(); it.getInt(0) })
    database.close()
  }

  private fun state(transactionId: UUID, status: CategorizationStatus, attempts: Int) = TxCategorizationState(
    transactionId = transactionId,
    requestedCategoryId = CategoryId.from("00000000-0000-4000-8000-000000000102"),
    status = status,
    errorCode = if (status == CategorizationStatus.FAILED) "temporary" else null,
    errorMessage = if (status == CategorizationStatus.FAILED) "retry" else null,
    attempts = attempts,
    nextAttemptAt = if (status == CategorizationStatus.FAILED) Instant.parse("2026-07-03T00:00:00Z") else null,
    updatedAt = Instant.parse("2026-07-01T00:00:00Z"),
    createdAt = Instant.parse("2026-07-01T00:00:00Z"),
  )
}
