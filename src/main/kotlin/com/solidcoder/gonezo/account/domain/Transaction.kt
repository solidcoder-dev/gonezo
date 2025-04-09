package com.solidcoder.gonezo.account.domain

import java.time.LocalDate
import java.util.*

data class Transaction(
    val id: UUID = UUID.randomUUID(),
    val accountId: UUID,
    val amount: Amount,
    val type: TransactionType,
    val description: String,
    val date: LocalDate,
    val category: String?
)
