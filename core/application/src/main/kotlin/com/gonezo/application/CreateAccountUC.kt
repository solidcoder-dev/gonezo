package com.gonezo.application

import java.util.UUID

data class CreateAccountCommand(
  val userId: UUID,
  val name: String,
  val type: com.gonezo.domain.cashledger.AccountType,
  val currency: String,
)

interface CreateAccountUC {
  fun execute(command: CreateAccountCommand): UUID
}
