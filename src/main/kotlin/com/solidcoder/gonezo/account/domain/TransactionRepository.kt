package com.solidcoder.gonezo.account.domain

import org.springframework.stereotype.Repository

interface TransactionRepository {
    fun save(transaction: Transaction)
}

@Repository
class TransactionRepositoryV1 : TransactionRepository {
    override fun save(transaction: Transaction) {
        TODO("Not yet implemented")
    }
}
