package com.gonezo.application.orchestration

import com.gonezo.taxonomy.application.AssignCategoryToTransactionCommand
import com.gonezo.taxonomy.application.AssignCategoryToTransactionUC
import com.gonezo.application.orchestration.CategorizationStatus
import com.gonezo.application.orchestration.ProcessTransactionCategorizationCommand
import com.gonezo.application.orchestration.TxCategorizationState
import com.gonezo.application.orchestration.TxCategorizationStateRepository
import com.gonezo.taxonomy.domain.CategoryId
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class ProcessTransactionCategorizationServiceTest {

  @Test
  fun `returns none when category is not requested`() {
    val repository = InMemoryTxCategorizationStateRepository()
    val taxonomy = RecordingAssignCategoryUC()
    val service = ProcessTransactionCategorizationService(taxonomy, repository)
    val txId = UUID.randomUUID()

    val result = service.execute(
      ProcessTransactionCategorizationCommand(
        transactionId = txId,
        transactionType = "expense",
        requestedCategoryId = null,
        processedAt = Instant.parse("2026-03-22T16:00:00Z"),
      ),
    )

    assertThat(result.status).isEqualTo(CategorizationStatus.NONE)
    assertThat(taxonomy.calls).isEmpty()
  }

  @Test
  fun `marks assigned when taxonomy succeeds`() {
    val repository = InMemoryTxCategorizationStateRepository()
    val taxonomy = RecordingAssignCategoryUC()
    val service = ProcessTransactionCategorizationService(taxonomy, repository)
    val txId = UUID.randomUUID()
    val categoryId = CategoryId.random()

    val result = service.execute(
      ProcessTransactionCategorizationCommand(
        transactionId = txId,
        transactionType = "income",
        requestedCategoryId = categoryId,
        processedAt = Instant.parse("2026-03-22T16:00:00Z"),
      ),
    )

    assertThat(result.status).isEqualTo(CategorizationStatus.ASSIGNED)
    assertThat(result.errorCode).isNull()
    assertThat(taxonomy.calls).hasSize(1)
  }

  @Test
  fun `marks failed when transfer includes category`() {
    val repository = InMemoryTxCategorizationStateRepository()
    val taxonomy = RecordingAssignCategoryUC()
    val service = ProcessTransactionCategorizationService(taxonomy, repository)

    val result = service.execute(
      ProcessTransactionCategorizationCommand(
        transactionId = UUID.randomUUID(),
        transactionType = "transfer_out",
        requestedCategoryId = CategoryId.random(),
        processedAt = Instant.parse("2026-03-22T16:00:00Z"),
      ),
    )

    assertThat(result.status).isEqualTo(CategorizationStatus.FAILED)
    assertThat(result.errorCode).isEqualTo("CATEGORY_NOT_ALLOWED_FOR_TRANSFER")
    assertThat(taxonomy.calls).isEmpty()
  }

  @Test
  fun `marks failed and increments attempts when taxonomy throws`() {
    val repository = InMemoryTxCategorizationStateRepository()
    val taxonomy = RecordingAssignCategoryUC(throwOnCall = IllegalStateException("CATEGORY_NOT_FOUND"))
    val service = ProcessTransactionCategorizationService(taxonomy, repository)
    val txId = UUID.randomUUID()

    val first = service.execute(
      ProcessTransactionCategorizationCommand(
        transactionId = txId,
        transactionType = "expense",
        requestedCategoryId = CategoryId.random(),
        processedAt = Instant.parse("2026-03-22T16:00:00Z"),
      ),
    )
    val second = service.execute(
      ProcessTransactionCategorizationCommand(
        transactionId = txId,
        transactionType = "expense",
        requestedCategoryId = CategoryId.random(),
        processedAt = Instant.parse("2026-03-22T16:01:00Z"),
      ),
    )

    assertThat(first.status).isEqualTo(CategorizationStatus.FAILED)
    assertThat(second.status).isEqualTo(CategorizationStatus.FAILED)
    assertThat(second.attempts).isEqualTo(2)
  }
}

private class InMemoryTxCategorizationStateRepository : TxCategorizationStateRepository {
  private val states = linkedMapOf<UUID, TxCategorizationState>()

  override fun upsert(state: TxCategorizationState) {
    states[state.transactionId] = state
  }

  override fun findByTransactionId(transactionId: UUID): TxCategorizationState? = states[transactionId]

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TxCategorizationState> =
    transactionIds.mapNotNull { id -> states[id]?.let { id to it } }.toMap()

  override fun deleteByTransactionIds(transactionIds: Collection<UUID>) {
    transactionIds.forEach(states::remove)
  }

  override fun findPending(now: Instant, limit: Int): List<TxCategorizationState> =
    states.values
      .filter { it.status == CategorizationStatus.PENDING }
      .take(limit)
}

private class RecordingAssignCategoryUC(
  private val throwOnCall: RuntimeException? = null,
) : AssignCategoryToTransactionUC {
  val calls = mutableListOf<AssignCategoryToTransactionCommand>()

  override fun execute(command: AssignCategoryToTransactionCommand) {
    calls += command
    throwOnCall?.let { throw it }
  }
}
