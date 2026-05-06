package com.gonezo.application.services.expected

import com.gonezo.expected.application.CreateExpectedMovementCommand
import com.gonezo.expected.application.CreateExpectedMovementService
import com.gonezo.expected.application.DismissExpectedMovementCommand
import com.gonezo.expected.application.DismissExpectedMovementService
import com.gonezo.expected.application.ListExpectedMovementsQuery
import com.gonezo.expected.application.ListExpectedMovementsService
import com.gonezo.expected.application.ResolveExpectedMovementCommand
import com.gonezo.expected.application.ResolveExpectedMovementService
import com.gonezo.expected.application.UpdateExpectedMovementCommand
import com.gonezo.expected.application.UpdateExpectedMovementService
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
  private val update = UpdateExpectedMovementService(repository)
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
        currency = "EUR",
        expectedAt = Instant.parse("2026-05-05T10:00:00Z"),
        description = "Refund adjustment",
        merchant = "Amazon",
        categoryId = "cat-shopping",
        splitItems = listOf(
          ExpectedMovement.SplitItem(id = "item-a", name = "Item A", amount = BigDecimal("10.00")),
          ExpectedMovement.SplitItem(id = "item-b", name = "Item B", amount = BigDecimal("19.99")),
        ),
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
  fun `update replaces the pending expected movement without changing its identity`() {
    val id = createExpectedMovement()

    update.execute(
      UpdateExpectedMovementCommand(
        expectedMovementId = id,
        accountId = "account-1",
        type = "expense",
        amount = BigDecimal("30.00"),
        currency = "EUR",
        expectedAt = Instant.parse("2026-05-06T10:00:00Z"),
        description = "Updated refund",
        merchant = "Updated merchant",
        categoryId = "cat-food",
        splitItems = listOf(
          ExpectedMovement.SplitItem(id = "item-a", name = "Item A", amount = BigDecimal("12.00")),
          ExpectedMovement.SplitItem(id = "item-b", name = "Item B", amount = BigDecimal("18.00")),
        ),
        updatedAt = Instant.parse("2026-05-02T10:00:00Z"),
      ),
    )

    val stored = repository.findById(id)
    assertThat(stored).isNotNull
    assertThat(stored!!.id).isEqualTo(id)
    assertThat(stored.amount).isEqualTo(BigDecimal("30.00"))
    assertThat(stored.currency).isEqualTo("EUR")
    assertThat(stored.description).isEqualTo("Updated refund")
    assertThat(stored.merchant).isEqualTo("Updated merchant")
    assertThat(stored.splitItems).hasSize(2)
    assertThat(repository.listByAccount("account-1", includeClosed = true)).hasSize(1)
  }

  @Test
  fun `update fails when expected movement is no longer pending`() {
    val id = createExpectedMovement()
    resolve.execute(
      ResolveExpectedMovementCommand(
        expectedMovementId = id,
        transactionId = "tx-posted-1",
        resolvedAt = Instant.parse("2026-05-04T11:00:00Z"),
      ),
    )

    assertThatThrownBy {
      update.execute(
        UpdateExpectedMovementCommand(
          expectedMovementId = id,
          accountId = "account-1",
          type = "expense",
          amount = BigDecimal("31.00"),
          currency = "EUR",
          expectedAt = Instant.parse("2026-05-06T10:00:00Z"),
          description = "Updated refund",
          merchant = "Updated merchant",
          categoryId = "cat-food",
          splitItems = emptyList(),
          updatedAt = Instant.parse("2026-05-02T10:00:00Z"),
        ),
      )
    }
      .isInstanceOf(IllegalStateException::class.java)
      .hasMessageContaining("Only pending expected movements can be changed")
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
      splitItems = listOf(
        ExpectedMovement.SplitItem(id = "item-a", name = "Item A", amount = BigDecimal("10.00")),
        ExpectedMovement.SplitItem(id = "item-b", name = "Item B", amount = BigDecimal("19.99")),
      ),
      createdAt = Instant.parse("2026-05-01T10:00:00Z"),
    ),
  )

  private class InMemoryExpectedMovementRepository : ExpectedMovementRepository {
    private val storage = linkedMapOf<ExpectedMovementId, ExpectedMovement>()

    override fun save(movement: ExpectedMovement) {
      storage[movement.id] = movement
    }

    override fun findById(id: ExpectedMovementId): ExpectedMovement? = storage[id]

    override fun findByOriginOccurrenceId(originOccurrenceId: String): ExpectedMovement? = storage.values
      .firstOrNull { it.originOccurrenceId == originOccurrenceId }

    override fun listByAccount(accountId: String, includeClosed: Boolean): List<ExpectedMovement> = storage.values
      .filter { it.accountId == accountId }
      .filter { includeClosed || it.status == ExpectedMovementStatus.PENDING }
      .sortedWith(compareBy<ExpectedMovement> { it.expectedAt }.thenBy { it.id.toString() })
  }
}
