package com.solidcoder.gonezo.account.domain

import java.util.*
import org.springframework.stereotype.Repository

interface AccountRepository {
    fun findById(accountId: UUID): Account?
}

@Repository
class AccountRepositoryV1 : AccountRepository {
    override fun findById(accountId: UUID): Account? {
        TODO("Not yet implemented")
    }
}
