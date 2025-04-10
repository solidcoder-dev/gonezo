package com.solidcoder.gonezo.account.api.dto

import java.math.BigDecimal
import java.util.*

data class BalanceDto(
    val accountId: UUID,
    val balance: BigDecimal,
    val currency: String
)
