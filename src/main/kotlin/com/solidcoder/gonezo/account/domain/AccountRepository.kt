package com.solidcoder.gonezo.account.domain

import java.util.*
import org.springframework.stereotype.Repository

interface AccountRepository {
    fun findById(accountId: UUID): Account?
    fun save(account: Account)
}

@Repository
class AccountRepositoryV1 : AccountRepository {
    override fun findById(accountId: UUID): Account? {
        TODO("Not yet implemented")
    }

    override fun save(account: Account) {
        TODO("Not yet implemented")
    }
}
