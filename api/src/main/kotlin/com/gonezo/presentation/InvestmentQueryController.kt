package com.gonezo.presentation

import com.gonezo.domain.investments.ports.InvestmentTransactionRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/investments")
class InvestmentQueryController(
  private val investmentTransactionRepository: InvestmentTransactionRepository,
) {

  @GetMapping("/containers/{containerId}/transactions")
  fun listTransactions(@PathVariable containerId: UUID): List<InvestmentTransactionResponse> {
    return investmentTransactionRepository.listByContainer(containerId).map { tx ->
      InvestmentTransactionResponse(
        id = tx.id,
        containerId = tx.containerId,
        date = tx.date,
        type = tx.type.value,
        assetId = tx.assetId,
        quantity = tx.quantity,
        amount = tx.amount.amount,
        currency = tx.amount.currency,
        feesAmount = tx.fees?.amount,
        feesCurrency = tx.fees?.currency,
        note = tx.note,
      )
    }
  }
}

data class InvestmentTransactionResponse(
  val id: UUID,
  val containerId: UUID,
  val date: LocalDate,
  val type: String,
  val assetId: UUID?,
  val quantity: BigDecimal?,
  val amount: BigDecimal,
  val currency: String,
  val feesAmount: BigDecimal?,
  val feesCurrency: String?,
  val note: String?,
)
