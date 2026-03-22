package com.gonezo.application.workflows

import com.gonezo.domain.ledger.AccountId
import com.gonezo.domain.ledger.DateRange
import com.gonezo.domain.ledger.Transaction
import com.gonezo.domain.taxonomy.CategoryId

data class GetCategorizedLedgerTransactionListQuery(
  val accountId: AccountId,
  val limit: Int? = null,
  val range: DateRange? = null,
  val merchant: String? = null,
)

data class CategorizedCategoryView(
  val id: CategoryId,
  val name: String,
)

data class CategorizationView(
  val status: CategorizationStatus,
  val requestedCategoryId: CategoryId?,
  val errorCode: String?,
  val errorMessage: String?,
  val attempts: Int,
)

data class CategorizedLedgerTransactionView(
  val transaction: Transaction,
  val category: CategorizedCategoryView?,
  val categorization: CategorizationView,
)

interface GetCategorizedLedgerTransactionListUC {
  fun execute(query: GetCategorizedLedgerTransactionListQuery): List<CategorizedLedgerTransactionView>
}
