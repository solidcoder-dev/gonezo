package com.gonezo.application.orchestration

import com.gonezo.ledger.domain.TransactionId
import com.gonezo.taxonomy.domain.CategoryId
import java.time.Instant

data class CategorizeLedgerTransactionCommand(
  val transactionId: TransactionId,
  val transactionType: String,
  val categoryId: CategoryId? = null,
  val newCategoryName: String? = null,
  val requestedAt: Instant,
)

interface CategorizeLedgerTransactionUC {
  fun execute(command: CategorizeLedgerTransactionCommand): TxCategorizationState
}
