package com.solidcoder.gonezo.infrastructure.mapper

import com.solidcoder.gonezo.account.domain.Amount
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.infrastructure.persistence.TransactionEntity
import org.springframework.stereotype.Component


interface TransactionMapper {
    fun toEntity(tx: Transaction): TransactionEntity
    fun toDomain(entity: TransactionEntity): Transaction
}

@Component
class TransactionMapperV1 : TransactionMapper {
    override fun toEntity(tx: Transaction): TransactionEntity {
        return TransactionEntity(
            id = tx.id,
            accountId = tx.accountId,
            amount = tx.amount.value,
            currency = tx.amount.currency.code,
            type = tx.type,
            description = tx.description,
            category = tx.category,
            date = tx.date
        )
    }

    override fun toDomain(entity: TransactionEntity): Transaction {
        return Transaction(
            id = entity.id,
            accountId = entity.accountId,
            amount = Amount(entity.amount, Currency(entity.currency)),
            type = entity.type,
            description = entity.description,
            category = entity.category,
            date = entity.date
        )
    }
}