package com.gonezo.application.services.expected

import com.gonezo.expected.application.CreateExpectedMovementCommand
import com.gonezo.expected.application.CreateExpectedMovementService
import com.gonezo.expected.application.DismissExpectedMovementCommand
import com.gonezo.expected.application.DismissExpectedMovementService
import com.gonezo.expected.application.ListExpectedMovementsQuery
import com.gonezo.expected.application.ListExpectedMovementsService
import com.gonezo.expected.application.ResolveExpectedMovementCommand
import com.gonezo.expected.application.ResolveExpectedMovementService
import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class ExpectedMovementServicesTest {
  private val repository = InMemoryExpectedMovementRepository()
  private val create = CreateExpectedMovementService(repository)
  private val resolve = ResolveExpectedMovementService(repository)
  private val dismiss = DismissExpectedMovementService(repository)
  private val list = ListExpectedMovementsService(repository)

  @Test
  fun `create stores a pending expected movement`() {
    val id = create.execute(
      CreateExpectedMovementCommand(
        accountId = "account-1",
        type = "expense",
        amount = BigDecimal("29.99"),
        currency = "eur",
        expectedAt = Instant.parse("2026-05-05T10:00:00Z"),
        description = "Refund adjustment",
        merchant = "Amazon",
        categoryId = "cat-shopping",
        createdAt = Instant.parse("2026-05-01T10:00:00Z"),
      ),
    )

    val stored = repository.findById(id)
    assertThat(stored).isNotNull
    assertThat(stored!!.status).isEqualTo(ExpectedMovementStatus.PENDING)
    assertThat(stored.currency).isEqualTo("EUR")
    assertThat(stored.merchant).isEqualTo("Amazon")
  }

  @Test
  fun `resolve marks expected movement as arrived and links posted transaction`() {
    val id = createExpectedMovement()

    resolve.execute(
      ResolveExpectedMovementCommand(
        expectedMovementId = id,
        transactionId = "tx-posted-1",
        resolvedAt = Instant.parse("2026-05-04T11:00:00Z"),
      ),
    )

    val stored = repository.findById(id)
    assertThat(stored!!.status).isEqualTo(ExpectedMovementStatus.RESOLVED)
    assertThat(stored.resolvedTransactionId).isEqualTo("tx-posted-1")
  }

  @Test
  fun `dismiss marks expected movement as dismissed`() {
    val id = createExpectedMovement()

    dismiss.execute(
      DismissExpectedMovementCommand(
        expectedMovementId = id,
        dismissedAt = Instant.parse("2026-05-07T11:00:00Z"),
      ),
    )

    val stored = repository.findById(id)
    assertThat(stored!!.status).isEqualTo(ExpectedMovementStatus.DISMISSED)
    assertThat(stored.dismissedAt).isEqualTo(Instant.parse("2026-05-07T11:00:00Z"))
  }

  @Test
  fun `list excludes resolved and dismissed movements by default`() {
    val pendingId = createExpectedMovement(merchant = "Pending")
    val resolvedId = createExpectedMovement(merchant = "Resolved")
    resolve.execute(
      ResolveExpectedMovementCommand(
        expectedMovementId = resolvedId,
        transactionId = "tx-posted-1",
        resolvedAt = Instant.parse("2026-05-04T11:00:00Z"),
      ),
    )

    val pendingOnly = list.execute(ListExpectedMovementsQuery(accountId = "account-1"))
    val withClosed = list.execute(ListExpectedMovementsQuery(accountId = "account-1", includeClosed = true))

    assertThat(pendingOnly.map { it.id }).containsExactly(pendingId.toString())
    assertThat(withClosed.map { it.id }).containsExactlyInAnyOrder(pendingId.toString(), resolvedId.toString())
  }

  @Test
  fun `resolve fails when expected movement does not exist`() {
    assertThatThrownBy {
      resolve.execute(
        ResolveExpectedMovementCommand(
          expectedMovementId = ExpectedMovementId.random(),
          transactionId = "tx-posted-1",
          resolvedAt = Instant.parse("2026-05-04T11:00:00Z"),
        ),
      )
    }
      .isInstanceOf(IllegalStateException::class.java)
      .hasMessageContaining("Expected movement not found")
  }

  private fun createExpectedMovement(
    merchant: String = "Amazon",
  ): ExpectedMovementId = create.execute(
    CreateExpectedMovementCommand(
      accountId = "account-1",
      type = "expense",
      amount = BigDecimal("29.99"),
      currency = "EUR",
      expectedAt = Instant.parse("2026-05-05T10:00:00Z"),
      description = "Expected refund",
      merchant = merchant,
      categoryId = "cat-shopping",
      createdAt = Instant.parse("2026-05-01T10:00:00Z"),
    ),
  )

  private class InMemoryExpectedMovementRepository : ExpectedMovementRepository {
    private val storage = linkedMapOf<ExpectedMovementId, ExpectedMovement>()

    override fun save(movement: ExpectedMovement) {
      storage[movement.id] = movement
    }

    override fun findById(id: ExpectedMovementId): ExpectedMovement? = storage[id]

    override fun listByAccount(accountId: String, includeClosed: Boolean): List<ExpectedMovement> = storage.values
      .filter { it.accountId == accountId }
      .filter { includeClosed || it.status == ExpectedMovementStatus.PENDING }
      .sortedWith(compareBy<ExpectedMovement> { it.expectedAt }.thenBy { it.id.toString() })
  }
}
