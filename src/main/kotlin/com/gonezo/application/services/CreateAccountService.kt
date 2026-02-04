package com.gonezo.application.services

import com.gonezo.application.CreateAccountCommand
import com.gonezo.application.CreateAccountUC
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.domain.cashledger.Account
import com.gonezo.domain.cashledger.events.AccountCreated
import com.gonezo.domain.cashledger.ports.AccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class CreateAccountService(
  private val accountRepository: AccountRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : CreateAccountUC {

  @Transactional
  override fun execute(command: CreateAccountCommand): UUID {
    val accountId = UUID.randomUUID()
    val account = Account(
      id = accountId,
      userId = command.userId,
      name = command.name,
      type = command.type,
      currency = command.currency,
    )

    accountRepository.save(account)
    domainEventPublisher.publish(AccountCreated(accountId))
    return accountId
  }
}
