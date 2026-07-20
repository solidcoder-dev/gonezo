package com.gonezo.persistence.workflows

import com.gonezo.application.orchestration.PostExpectedMovementResult
import com.gonezo.application.orchestration.ProcessedExpectedPosting
import com.gonezo.infrastructure.persistence.JdbcExpectedPostingIdempotencyRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class JdbcExpectedPostingIdempotencyRepositoryE2ETest : SqliteE2ETest() {
  @Test
  fun `stores and reloads the complete successful posting result`() {
    val repository = JdbcExpectedPostingIdempotencyRepository(db.namedJdbcTemplate)
    val stored = ProcessedExpectedPosting(
      idempotencyKey = "post-1",
      expectedMovementId = "expected-1",
      result = PostExpectedMovementResult("transaction-1", "share-1"),
    )

    seedPostingRows()

    repository.save(stored)

    assertThat(repository.findByKey("post-1")).isEqualTo(stored.copy(completionStatus = "completed"))
  }

  @Test
  fun `database rejects a second successful posting for the same expected movement`() {
    val repository = JdbcExpectedPostingIdempotencyRepository(db.namedJdbcTemplate)
    seedPostingRows()
    repository.save(ProcessedExpectedPosting("post-1", "expected-1", PostExpectedMovementResult("transaction-1")))

    assertThatThrownBy {
      repository.save(ProcessedExpectedPosting("post-2", "expected-1", PostExpectedMovementResult("transaction-2")))
    }.isInstanceOf(RuntimeException::class.java)
  }

  private fun seedPostingRows() {
    db.namedJdbcTemplate.update("insert into ledger_accounts(id, name, type, currency, status, created_at) values ('account-1', 'Cash', 'cash', 'EUR', 'active', '2026-07-20T10:00:00Z')", emptyMap<String, Any>())
    db.namedJdbcTemplate.update("insert into expected_movements(id, account_id, movement_type, amount, currency, expected_at, status, created_at, updated_at) values ('expected-1', 'account-1', 'expense', '10.00', 'EUR', '2026-07-20T10:00:00Z', 'pending', '2026-07-20T10:00:00Z', '2026-07-20T10:00:00Z')", emptyMap<String, Any>())
    db.namedJdbcTemplate.update("insert into ledger_transactions(id, account_id, type, amount, currency, occurred_at, status) values ('transaction-1', 'account-1', 'expense', '10.00', 'EUR', '2026-07-20T10:00:00Z', 'posted')", emptyMap<String, Any>())
    db.namedJdbcTemplate.update("insert into ledger_transactions(id, account_id, type, amount, currency, occurred_at, status) values ('transaction-2', 'account-1', 'expense', '10.00', 'EUR', '2026-07-20T10:00:00Z', 'posted')", emptyMap<String, Any>())
  }
}
