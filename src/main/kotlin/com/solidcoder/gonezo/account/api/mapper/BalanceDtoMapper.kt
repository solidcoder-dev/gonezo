package com.solidcoder.gonezo.account.api.mapper

import com.solidcoder.gonezo.account.api.dto.BalanceDto
import com.solidcoder.gonezo.account.domain.Balance
import org.springframework.stereotype.Service

interface BalanceDtoMapper {
    fun toBalanceDto(balance: Balance): BalanceDto
}

@Service
class BalanceDtoMapperV1 : BalanceDtoMapper {
    override fun toBalanceDto(balance: Balance): BalanceDto =
        BalanceDto(
            accountId = balance.accountId,
            balance = balance.amount,
            currency = balance.currency.code
        )
}