package com.solidcoder.gonezo.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.*

@Entity
@Table(name = "accounts")
class AccountEntity(

    @Id
    val id: UUID,

    @Column(nullable = false)
    val holderId: UUID,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false, length = 3)
    val currency: String
)
