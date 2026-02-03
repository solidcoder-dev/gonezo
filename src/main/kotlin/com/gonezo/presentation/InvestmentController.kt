package com.gonezo.presentation

import com.gonezo.application.ExecuteInvestmentCommand
import com.gonezo.application.ExecuteInvestmentUC
import com.gonezo.domain.shared.Money
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/investments")
class InvestmentController(
  private val executeInvestmentUC: ExecuteInvestmentUC,
) {

  @PostMapping("/execute")
  fun execute(@Valid @RequestBody request: ExecuteInvestmentRequest): ResponseEntity<ExecuteInvestmentResponse> {
    val id = executeInvestmentUC.execute(
      ExecuteInvestmentCommand(
        containerId = request.containerId,
        date = request.date,
        type = request.type,
        assetId = request.assetId,
        quantity = request.quantity,
        amount = Money(request.amount, request.currency),
        fees = request.feesAmount?.let { Money(it, request.currency) },
        note = request.note,
        budgetPeriodId = request.budgetPeriodId,
        categoryId = request.categoryId,
      ),
    )

    return ResponseEntity.status(HttpStatus.CREATED).body(ExecuteInvestmentResponse(id))
  }
}

data class ExecuteInvestmentRequest(
  @field:NotNull
  val containerId: UUID,
  @field:NotNull
  val date: LocalDate,
  @field:NotBlank
  val type: String,
  val assetId: UUID?,
  val quantity: BigDecimal?,
  @field:NotNull
  val amount: BigDecimal,
  @field:NotBlank
  val currency: String,
  val feesAmount: BigDecimal?,
  val note: String?,
  val budgetPeriodId: UUID?,
  val categoryId: UUID?,
)

data class ExecuteInvestmentResponse(
  val id: UUID,
)
