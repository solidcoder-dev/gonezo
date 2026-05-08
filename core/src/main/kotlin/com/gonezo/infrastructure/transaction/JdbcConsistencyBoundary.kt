package com.gonezo.infrastructure.transaction

import com.gonezo.application.ConsistencyBoundary
import org.springframework.transaction.support.TransactionOperations

class JdbcConsistencyBoundary(
  private val transactionOperations: TransactionOperations,
) : ConsistencyBoundary {
  override fun <T> withinConsistencyBoundary(block: () -> T): T =
    transactionOperations.execute<T> { block() }
      ?: throw IllegalStateException("Consistency boundary returned null")
}
