package com.solidcoder.gonezo.infrastructure.repository

import com.solidcoder.gonezo.infrastructure.persistence.AccountHolderEntity
import java.util.*
import org.springframework.data.jpa.repository.JpaRepository

interface JpaAccountHolderRepository : JpaRepository<AccountHolderEntity, UUID>
