package com.solidcoder.gonezo.infrastructure.projection

import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

data class TransactionView(
    val id: UUID,
    val accountId: UUID,
    val amount: BigDecimal,
    val currency: String,
    val type: String,
    val description: String,
    val category: String?,
    val date: LocalDate,
)
