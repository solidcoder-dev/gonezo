package com.solidcoder.gonezo.account.domain

import java.math.BigDecimal

data class Amount(val value: BigDecimal, val currency: Currency) {
    init {
        require(value > BigDecimal.ZERO) { "Amount must be greater than zero" }
    }
}
