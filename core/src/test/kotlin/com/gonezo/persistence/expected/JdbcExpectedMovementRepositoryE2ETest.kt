package com.gonezo.persistence.expected

import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.expected.infrastructure.persistence.JdbcExpectedMovementRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class JdbcExpectedMovementRepositoryE2ETest : SqliteE2ETest() {
  @Test
  fun `saves and finds expected movement`() {
    val repository = JdbcExpectedMovementRepository(db.namedJdbcTemplate)
    val movement = expectedMovement()

    repository.save(movement)

    val stored = repository.findById(movement.id)
    assertThat(stored).isEqualTo(movement)
  }

  @Test
  fun `upsert stores resolved status and linked posted transaction`() {
    val repository = JdbcExpectedMovementRepository(db.namedJdbcTemplate)
    val movement = expectedMovement()
    repository.save(movement)

    val resolved = movement.resolve(
      transactionId = "tx-posted-1",
      at = Instant.parse("2026-05-04T11:00:00Z"),
    )
    repository.save(resolved)

    val stored = repository.findById(movement.id)
    assertThat(stored!!.status).isEqualTo(ExpectedMovementStatus.RESOLVED)
    assertThat(stored.resolvedTransactionId).isEqualTo("tx-posted-1")
    assertThat(stored.resolvedAt).isEqualTo(Instant.parse("2026-05-04T11:00:00Z"))
  }

  @Test
  fun `list by account excludes closed movements unless requested`() {
    val repository = JdbcExpectedMovementRepository(db.namedJdbcTemplate)
    val pending = expectedMovement(merchant = "Pending")
    val dismissed = expectedMovement(merchant = "Dismissed").dismiss(Instant.parse("2026-05-06T10:00:00Z"))
    val otherAccount = expectedMovement(accountId = "account-2", merchant = "Other account")

    repository.save(pending)
    repository.save(dismissed)
    repository.save(otherAccount)

    val pendingOnly = repository.listByAccount("account-1", includeClosed = false)
    val withClosed = repository.listByAccount("account-1", includeClosed = true)

    assertThat(pendingOnly.map { it.id }).containsExactly(pending.id)
    assertThat(withClosed.map { it.id }).containsExactlyInAnyOrder(pending.id, dismissed.id)
  }

  @Test
  fun `find by origin occurrence id returns linked expected movement`() {
    val repository = JdbcExpectedMovementRepository(db.namedJdbcTemplate)
    val originOccurrenceId = "a625f942-c4ab-4129-8998-cece47eb9592"
    val movement = expectedMovement(originOccurrenceId = originOccurrenceId)
    repository.save(movement)

    val loaded = repository.findByOriginOccurrenceId(originOccurrenceId)

    assertThat(loaded).isEqualTo(movement)
  }

  @Test
  fun `round trips expected item source template identity separately from occurrence item identity`() {
    val repository = JdbcExpectedMovementRepository(db.namedJdbcTemplate)
    val movement = expectedMovement().let {
      it.copy(
        splitItems = listOf(
          ExpectedMovement.SplitItem(
            id = "occurrence-item-a",
            name = "Invoice A",
            amount = BigDecimal("70.00"),
            sourceTemplateItemId = "template-item-a",
          ),
          ExpectedMovement.SplitItem(
            id = "occurrence-item-b",
            name = "Invoice B",
            amount = BigDecimal("50.00"),
            sourceTemplateItemId = "template-item-b",
          ),
        ),
      )
    }

    repository.save(movement)

    val stored = repository.findById(movement.id)
    assertThat(stored!!.splitItems.map { it.id })
      .containsExactly("occurrence-item-a", "occurrence-item-b")
    assertThat(stored.splitItems.map { it.sourceTemplateItemId })
      .containsExactly("template-item-a", "template-item-b")
  }

  @Test
  fun `unique index prevents two expected movements linked to same origin occurrence`() {
    val repository = JdbcExpectedMovementRepository(db.namedJdbcTemplate)
    val originOccurrenceId = "6b93faca-53f9-48e4-af06-ed65cddb9917"
    val first = expectedMovement(originOccurrenceId = originOccurrenceId)
    val second = expectedMovement(
      merchant = "Another",
      originOccurrenceId = originOccurrenceId,
    )
    repository.save(first)

    org.assertj.core.api.Assertions.assertThatThrownBy {
      repository.save(second)
    }
      .isInstanceOf(RuntimeException::class.java)
  }

  private fun expectedMovement(
    accountId: String = "account-1",
    merchant: String = "Client",
    originOccurrenceId: String? = null,
  ): ExpectedMovement = ExpectedMovement.create(
    id = ExpectedMovementId.random(),
    accountId = accountId,
    type = ExpectedMovementType.INCOME,
    amount = BigDecimal("120.00"),
    currency = "EUR",
    expectedAt = Instant.parse("2026-05-05T09:00:00Z"),
    description = "Client payment",
    merchant = merchant,
    categoryId = "cat-income",
    splitItems = listOf(
      ExpectedMovement.SplitItem(id = "${UUID.randomUUID()}-invoice-a", name = "Invoice A", amount = BigDecimal("70.00")),
      ExpectedMovement.SplitItem(id = "${UUID.randomUUID()}-invoice-b", name = "Invoice B", amount = BigDecimal("50.00")),
    ),
    createdAt = Instant.parse("2026-05-01T09:00:00Z"),
    originOccurrenceId = originOccurrenceId,
  )
}
