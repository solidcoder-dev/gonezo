package com.solidcoder.gonezo.account.api.dto

import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

data class TransactionDto(
    val id: UUID,
    val amount: BigDecimal,
    val currency: String,
    val type: String,
    val description: String,
    val category: String?,
    val date: LocalDate
)
