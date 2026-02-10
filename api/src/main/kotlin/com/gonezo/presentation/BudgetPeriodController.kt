package com.gonezo.presentation

import com.gonezo.application.CreateBudgetPeriodCommand
import com.gonezo.application.CreateBudgetPeriodUC
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/budget-periods")
class BudgetPeriodController(
  private val createBudgetPeriodUC: CreateBudgetPeriodUC,
) {

  @PostMapping
  fun create(@Valid @RequestBody request: CreateBudgetPeriodRequest): ResponseEntity<CreateBudgetPeriodResponse> {
    val id = createBudgetPeriodUC.execute(
      CreateBudgetPeriodCommand(
        planId = request.planId,
        year = request.year,
        month = request.month,
        currency = request.currency,
      ),
    )

    return ResponseEntity.status(HttpStatus.CREATED).body(CreateBudgetPeriodResponse(id))
  }
}

data class CreateBudgetPeriodRequest(
  @field:NotNull
  val planId: UUID,
  @field:NotNull
  val year: Int,
  @field:NotNull
  val month: Int,
  @field:NotBlank
  val currency: String,
)

data class CreateBudgetPeriodResponse(
  val id: UUID,
)
