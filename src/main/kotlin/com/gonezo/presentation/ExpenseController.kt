package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.application.PostExpenseUC
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
class ExpenseController(
  private val postExpenseUC: PostExpenseUC,
) {

  @PostMapping("/expense")
  fun postExpense(@Valid @RequestBody request: PostExpenseRequest): ResponseEntity<CreateTransactionResponse> {
    val id = postExpenseUC.execute(
      PostExpenseCommand(
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

data class PostExpenseRequest(
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
