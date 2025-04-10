package com.solidcoder.gonezo.account.api.dto

import java.math.BigDecimal
import java.time.LocalDate

data class CreateTransactionDto(
    val amount: BigDecimal,
    val currency: String,
    val type: String,
    val description: String,
    val category: String?,
    val date: LocalDate
)
