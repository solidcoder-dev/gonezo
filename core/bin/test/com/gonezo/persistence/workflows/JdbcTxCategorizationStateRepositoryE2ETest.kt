package com.gonezo.persistence.workflows

import com.gonezo.application.orchestration.CategorizationStatus
import com.gonezo.application.orchestration.TxCategorizationState
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.infrastructure.persistence.JdbcTxCategorizationStateRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class JdbcTxCategorizationStateRepositoryE2ETest : SqliteE2ETest() {

  @Test
  fun `upserts and finds workflow state by transaction id`() {
    val repository = JdbcTxCategorizationStateRepository(db.namedJdbcTemplate)
    val txId = UUID.randomUUID()
    val state = TxCategorizationState(
      transactionId = txId,
      requestedCategoryId = CategoryId.random(),
      status = CategorizationStatus.PENDING,
      errorCode = null,
      errorMessage = null,
      attempts = 1,
      nextAttemptAt = Instant.parse("2026-03-22T18:10:00Z"),
      updatedAt = Instant.parse("2026-03-22T18:00:00Z"),
      createdAt = Instant.parse("2026-03-22T18:00:00Z"),
    )

    repository.upsert(state)
    val stored = repository.findByTransactionId(txId)

    assertThat(stored).isNotNull
    assertThat(stored!!.status).isEqualTo(CategorizationStatus.PENDING)
    assertThat(stored.attempts).isEqualTo(1)
  }

  @Test
  fun `find pending returns only retryable states`() {
    val repository = JdbcTxCategorizationStateRepository(db.namedJdbcTemplate)
    val now = Instant.parse("2026-03-22T18:00:00Z")
    repository.upsert(
      TxCategorizationState(
        transactionId = UUID.randomUUID(),
        requestedCategoryId = CategoryId.random(),
        status = CategorizationStatus.PENDING,
        errorCode = null,
        errorMessage = null,
        attempts = 1,
        nextAttemptAt = null,
        updatedAt = now,
        createdAt = now,
      ),
    )
    repository.upsert(
      TxCategorizationState(
        transactionId = UUID.randomUUID(),
        requestedCategoryId = CategoryId.random(),
        status = CategorizationStatus.FAILED,
        errorCode = "CATEGORY_NOT_FOUND",
        errorMessage = "CATEGORY_NOT_FOUND",
        attempts = 1,
        nextAttemptAt = now.plusSeconds(30),
        updatedAt = now,
        createdAt = now,
      ),
    )
    repository.upsert(
      TxCategorizationState(
        transactionId = UUID.randomUUID(),
        requestedCategoryId = CategoryId.random(),
        status = CategorizationStatus.FAILED,
        errorCode = "CATEGORY_NOT_FOUND",
        errorMessage = "CATEGORY_NOT_FOUND",
        attempts = 1,
        nextAttemptAt = now.minusSeconds(10),
        updatedAt = now,
        createdAt = now,
      ),
    )

    val pending = repository.findPending(now = now, limit = 10)
    assertThat(pending).hasSize(2)
    assertThat(pending.map { it.status }).allMatch { it == CategorizationStatus.PENDING || it == CategorizationStatus.FAILED }
  }
}
