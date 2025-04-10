package com.solidcoder.gonezo.account.api.mapper

import com.solidcoder.gonezo.account.api.dto.TransactionDto
import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import org.springframework.stereotype.Component

interface TransactionViewMapper {
    fun toDto(view: TransactionView): TransactionDto
}

@Component
class TransactionViewMapperV1 : TransactionViewMapper {
    override fun toDto(view: TransactionView): TransactionDto {
        return TransactionDto(
            id = view.id,
            amount = view.amount,
            currency = view.currency,
            type = view.type,
            description = view.description,
            category = view.category,
            date = view.date
        )
    }
}
