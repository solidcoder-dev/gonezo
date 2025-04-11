package com.solidcoder.gonezo.account.domain.repository

import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.infrastructure.mapper.AccountEntityMapper
import com.solidcoder.gonezo.infrastructure.repository.JpaAccountRepository
import java.util.*
import org.springframework.stereotype.Repository

interface AccountRepository {
    fun findById(accountId: UUID): Account?
    fun save(account: Account)
}

@Repository
class AccountRepositoryV1(
    private val jpa: JpaAccountRepository,
    private val accountEntityMapper: AccountEntityMapper
) : AccountRepository {

    override fun findById(accountId: UUID): Account? {
        return jpa.findById(accountId)
            .map(accountEntityMapper::toDomain)
            .orElse(null)
    }

    override fun save(account: Account) {
        val entity = accountEntityMapper.toEntity(account)
        jpa.save(entity)
    }
}
