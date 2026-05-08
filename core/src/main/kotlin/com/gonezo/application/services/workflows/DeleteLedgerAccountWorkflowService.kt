package com.gonezo.application.orchestration

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.ledger.application.DeleteLedgerAccountCommand
import com.gonezo.ledger.application.DeleteLedgerAccountUC
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository

class DeleteLedgerAccountWorkflowService(
  private val transactionRepository: LedgerTransactionRepository,
  private val categoryAssignmentRepository: TransactionCategoryAssignmentRepository,
  private val tagAssignmentRepository: TransactionTagAssignmentRepository,
  private val categorizationStateRepository: TxCategorizationStateRepository,
  private val deleteLedgerAccountUC: DeleteLedgerAccountUC,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : DeleteLedgerAccountUC {
  override fun execute(command: DeleteLedgerAccountCommand) {
    consistencyBoundary.withinConsistencyBoundary {
      val transactionIds = transactionRepository
        .findByAccount(command.accountId, limit = null)
        .map { it.id.value }

      categoryAssignmentRepository.deleteByTransactionIds(transactionIds)
      tagAssignmentRepository.deleteByTransactionIds(transactionIds)
      categorizationStateRepository.deleteByTransactionIds(transactionIds)
      deleteLedgerAccountUC.execute(command)
    }
  }
}
