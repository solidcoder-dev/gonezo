package com.gonezo.presentation

import com.gonezo.application.PostIncomeCommand
import com.gonezo.application.PostIncomeUC
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
@RequestMapping("/transactions")
class TransactionController(
  private val postIncomeUC: PostIncomeUC,
) {

  @PostMapping("/income")
  fun postIncome(@Valid @RequestBody request: PostIncomeRequest): ResponseEntity<CreateTransactionResponse> {
    val id = postIncomeUC.execute(
      PostIncomeCommand(
        accountId = request.accountId,
        postedDate = request.postedDate,
        effectiveDate = request.effectiveDate,
        amount = Money(request.amount, request.currency),
        merchant = request.merchant,
        categoryId = request.categoryId,
        recurring = request.recurring,
      ),
    )

    return ResponseEntity.status(HttpStatus.CREATED).body(CreateTransactionResponse(id))
  }
}

data class PostIncomeRequest(
  @field:NotNull
  val accountId: UUID,
  @field:NotNull
  val postedDate: LocalDate,
  @field:NotNull
  val effectiveDate: LocalDate,
  @field:NotNull
  val amount: BigDecimal,
  @field:NotBlank
  val currency: String,
  val merchant: String?,
  val categoryId: UUID?,
  val recurring: Boolean = false,
)

data class CreateTransactionResponse(
  val id: UUID,
)
