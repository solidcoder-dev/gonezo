package com.solidcoder.gonezo.account.application.command

import com.solidcoder.gonezo.account.domain.repository.AccountHolderRepository
import com.solidcoder.gonezo.account.domain.service.AccountHolderFactory
import java.util.*
import org.springframework.stereotype.Service

interface CreateAccountHolder {
    fun handle(name: String): CreateAccountHolderResult
}

sealed class CreateAccountHolderResult {
    data class Success(val id: UUID) : CreateAccountHolderResult()
    data class InvalidAccountHolder(val reason: String) : CreateAccountHolderResult()
}

@Service
class CreateAccountHolderV1(
    private val repository: AccountHolderRepository,
    private val factory: AccountHolderFactory
) : CreateAccountHolder {

    override fun handle(name: String): CreateAccountHolderResult {
        return factory.create(name)
            .onRight {
                repository.save(it)
            }.fold(
                ifLeft = { CreateAccountHolderResult.InvalidAccountHolder(it.reason) },
                ifRight = { CreateAccountHolderResult.Success(it.id) }
            )
    }
}
