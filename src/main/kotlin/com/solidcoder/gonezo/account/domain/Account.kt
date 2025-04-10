package com.solidcoder.gonezo.account.domain

import java.util.*

class Account(
    val id: UUID = UUID.randomUUID(),
    val name: String,
    val currency: Currency
) {
    init {
        require(name.isNotBlank()) { "Account name must not be blank" }
    }

    fun validateTransaction(transaction: Transaction) {
        require(transaction.amount.currency == currency) {
            "Transaction currency (${transaction.amount.currency.code}) does not match account currency"
        }
    }
}
