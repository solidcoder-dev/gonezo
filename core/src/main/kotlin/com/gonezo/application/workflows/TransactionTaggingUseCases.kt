package com.gonezo.application.orchestration

import com.gonezo.ledger.domain.TransactionId
import com.gonezo.taxonomy.domain.TagId
import java.time.Instant

data class ApplyTransactionTagsCommand(val transactionId: TransactionId, val tagNames: List<String>, val requestedAt: Instant)

data class ApplyTransactionTagsResult(val tagIds: List<TagId>)

interface ApplyTransactionTagsUC {
    fun execute(command: ApplyTransactionTagsCommand): ApplyTransactionTagsResult
}

data class ApplyTransactionItemTagsCommand(val transactionItemId: com.gonezo.ledger.domain.TransactionItemId, val tagNames: List<String>, val requestedAt: Instant)

fun interface ApplyTransactionItemTagsUC {
    fun execute(command: ApplyTransactionItemTagsCommand): ApplyTransactionTagsResult
}
