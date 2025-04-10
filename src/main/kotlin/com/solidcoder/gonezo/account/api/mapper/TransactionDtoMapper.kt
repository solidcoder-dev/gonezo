package com.solidcoder.gonezo.account.api.mapper

import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.domain.Amount
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.TransactionType
import java.util.*
import org.springframework.stereotype.Component

interface TransactionDtoMapper {
    fun toDomain(accountId: UUID, dto: CreateTransactionDto): Transaction
}

@Component
class TransactionDtoMapperV1 : TransactionDtoMapper {
    override fun toDomain(accountId: UUID, dto: CreateTransactionDto): Transaction {
        return Transaction(
            accountId = accountId,
            amount = Amount(dto.amount, Currency(dto.currency.uppercase())),
            type = TransactionType.valueOf(dto.type.uppercase()),
            description = dto.description,
            date = dto.date,
            category = dto.category
        )
    }
}