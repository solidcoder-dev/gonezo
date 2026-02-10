package com.gonezo.application.services

import com.gonezo.application.RecordInvestmentReturnCommand
import com.gonezo.application.RecordInvestmentReturnUC
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.domain.investments.InvestmentTransaction
import com.gonezo.domain.investments.InvestmentTransactionType
import com.gonezo.domain.investments.events.InvestmentReturnRecorded
import com.gonezo.domain.investments.ports.FinancialContainerRepository
import com.gonezo.domain.investments.ports.InvestmentTransactionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class RecordInvestmentReturnService(
  private val financialContainerRepository: FinancialContainerRepository,
  private val investmentTransactionRepository: InvestmentTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : RecordInvestmentReturnUC {

  @Transactional
  override fun execute(command: RecordInvestmentReturnCommand): UUID {
    financialContainerRepository.get(command.containerId)

    val transaction = InvestmentTransaction(
      id = UUID.randomUUID(),
      containerId = command.containerId,
      date = command.date,
      type = InvestmentTransactionType.DIVIDEND,
      assetId = null,
      quantity = null,
      amount = command.amount,
      fees = null,
      taxes = null,
      note = command.note,
    )

    investmentTransactionRepository.save(transaction)
    domainEventPublisher.publish(InvestmentReturnRecorded(transaction.id))
    return transaction.id
  }
}
