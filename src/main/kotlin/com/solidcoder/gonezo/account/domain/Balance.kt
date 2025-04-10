package com.solidcoder.gonezo.account.domain

import java.math.BigDecimal
import java.util.*

data class Balance(
    val accountId: UUID,
    val amount: BigDecimal,
    val currency: Currency
)
