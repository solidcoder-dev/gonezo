package com.solidcoder.gonezo.infrastructure.projection

import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

interface TransactionView {
    fun getId(): UUID
    fun getAccountId(): UUID
    fun getAmount(): BigDecimal
    fun getCurrency(): String
    fun getType(): String
    fun getDescription(): String
    fun getCategory(): String?
    fun getDate(): LocalDate
}
