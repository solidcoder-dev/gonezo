package com.solidcoder.gonezo.account.domain.repository

import com.solidcoder.gonezo.account.domain.AccountHolder
import com.solidcoder.gonezo.infrastructure.mapper.AccountHolderEntityMapper
import com.solidcoder.gonezo.infrastructure.repository.JpaAccountHolderRepository
import java.util.*
import org.springframework.stereotype.Repository

interface AccountHolderRepository {
    fun save(accountHolder: AccountHolder)
    fun findById(id: UUID): AccountHolder?
}

@Repository
class AccountHolderRepositoryV1(
    private val jpa: JpaAccountHolderRepository,
    private val mapper: AccountHolderEntityMapper,
) : AccountHolderRepository {

    override fun save(accountHolder: AccountHolder) {
        jpa.save(mapper.toEntity(accountHolder))
    }

    override fun findById(id: UUID): AccountHolder? {
        return jpa.findById(id)
            .map(mapper::toDomain)
            .orElse(null)
    }
}
