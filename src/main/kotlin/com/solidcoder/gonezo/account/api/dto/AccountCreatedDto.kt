package com.solidcoder.gonezo.account.api.dto

import java.util.*

data class AccountCreatedDto(
    val id: UUID,
    val name: String,
    val currency: String
)
