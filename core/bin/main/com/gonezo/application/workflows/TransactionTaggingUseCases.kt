package com.gonezo.application.orchestration

import com.gonezo.ledger.domain.TransactionId
import com.gonezo.taxonomy.domain.TagId
import java.time.Instant

data class ApplyTransactionTagsCommand(
  val transactionId: TransactionId,
  val tagNames: List<String>,
  val requestedAt: Instant,
)

data class ApplyTransactionTagsResult(
  val tagIds: List<TagId>,
)

interface ApplyTransactionTagsUC {
  fun execute(command: ApplyTransactionTagsCommand): ApplyTransactionTagsResult
}
