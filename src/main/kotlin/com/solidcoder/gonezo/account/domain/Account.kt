package com.solidcoder.gonezo.account.domain

import java.util.*

class Account(
    val id: UUID,
    val name: String,
    private val currency: Currency
) {
    fun validateTransaction(transaction: Transaction) {
        require(transaction.amount.currency == currency) {
            "Transaction currency (${transaction.amount.currency.code}) does not match account currency"
        }
    }
}
