package com.solidcoder.gonezo.infrastructure.persistence

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.*

@Entity
@Table(name = "account_holders")
class AccountHolderEntity(

    @Id
    val id: UUID,

    @Column(name = "name")
    val name: String
)
