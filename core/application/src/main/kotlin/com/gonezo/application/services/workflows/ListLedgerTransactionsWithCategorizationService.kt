package com.gonezo.application.query

import com.gonezo.application.orchestration.CategorizationStatus
import com.gonezo.application.query.CategorizationView
import com.gonezo.application.query.CategorizedCategoryView
import com.gonezo.application.query.CategorizedLedgerTransactionView
import com.gonezo.application.query.GetCategorizedLedgerTransactionListQuery
import com.gonezo.application.query.GetCategorizedLedgerTransactionListUC
import com.gonezo.application.orchestration.TxCategorizationStateRepository
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository

class ListLedgerTransactionsWithCategorizationService(
  private val transactionRepository: LedgerTransactionRepository,
  private val assignmentRepository: TransactionCategoryAssignmentRepository,
  private val categoryRepository: CategoryRepository,
  private val stateRepository: TxCategorizationStateRepository,
) : GetCategorizedLedgerTransactionListUC {
  override fun execute(query: GetCategorizedLedgerTransactionListQuery): List<CategorizedLedgerTransactionView> {
    val transactions = when {
      query.range != null -> transactionRepository.findByAccountAndPeriod(query.accountId, query.range)
      !query.merchant.isNullOrBlank() -> transactionRepository.findByAccountAndMerchant(query.accountId, query.merchant)
      else -> transactionRepository.findByAccount(query.accountId, query.limit)
    }
      .filter { tx -> query.range == null || (!tx.occurredAt.isBefore(query.range.from) && !tx.occurredAt.isAfter(query.range.to)) }
      .filter { tx -> query.merchant.isNullOrBlank() || tx.merchant.equals(query.merchant, ignoreCase = true) }
      .sortedByDescending { it.occurredAt }
      .let { list -> query.limit?.let { list.take(it) } ?: list }

    val txIds = transactions.map { it.id.value }
    val assignments = assignmentRepository.findByTransactionIds(txIds)
    val categories = categoryRepository.findByIds(assignments.values.map { it.categoryId }.toSet())
    val states = stateRepository.findByTransactionIds(txIds)

    return transactions.map { tx ->
      val txId = tx.id.value
      val assignment = assignments[txId]
      val category = assignment?.categoryId?.let(categories::get)
      val state = states[txId]

      val status = when {
        state != null -> state.status
        assignment != null -> CategorizationStatus.ASSIGNED
        else -> CategorizationStatus.NONE
      }

      CategorizedLedgerTransactionView(
        transaction = tx,
        category = category?.let { CategorizedCategoryView(id = it.id, name = it.name) },
        categorization = CategorizationView(
          status = status,
          requestedCategoryId = state?.requestedCategoryId,
          errorCode = state?.errorCode,
          errorMessage = state?.errorMessage,
          attempts = state?.attempts ?: 0,
        ),
      )
    }
  }
}
