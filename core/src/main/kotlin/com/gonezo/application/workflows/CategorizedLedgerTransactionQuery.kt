package com.gonezo.application.query

import com.gonezo.application.orchestration.CategorizationStatus
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.DateRange
import com.gonezo.ledger.domain.Transaction
import com.gonezo.taxonomy.domain.CategoryId

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
