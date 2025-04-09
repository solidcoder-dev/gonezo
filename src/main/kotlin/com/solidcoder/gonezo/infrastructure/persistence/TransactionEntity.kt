package com.solidcoder.gonezo.infrastructure.persistence

import com.solidcoder.gonezo.account.domain.TransactionType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*

@Entity
@Table(name = "transactions")
class TransactionEntity(

    @Id
    val id: UUID,

    @Column(name = "account_id", nullable = false)
    val accountId: UUID,

    @Column(nullable = false)
    val amount: BigDecimal,

    @Column(nullable = false, length = 3)
    val currency: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val type: TransactionType,

    @Column(nullable = false)
    val description: String,

    val category: String? = null,

    @Column(nullable = false)
    val date: LocalDate
)
