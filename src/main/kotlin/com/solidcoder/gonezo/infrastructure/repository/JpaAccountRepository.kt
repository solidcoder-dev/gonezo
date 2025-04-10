package com.solidcoder.gonezo.infrastructure.repository

import com.solidcoder.gonezo.infrastructure.persistence.AccountEntity
import java.util.*
import org.springframework.data.jpa.repository.JpaRepository

interface JpaAccountRepository : JpaRepository<AccountEntity, UUID>
