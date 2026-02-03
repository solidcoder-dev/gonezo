package com.gonezo.presentation

import com.gonezo.application.PostTransferCommand
import com.gonezo.application.PostTransferUC
import com.gonezo.domain.shared.Money
import jakarta.validation.Valid
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
class TransferController(
  private val postTransferUC: PostTransferUC,
) {

  @PostMapping("/transfer")
  fun postTransfer(@Valid @RequestBody request: PostTransferRequest): ResponseEntity<TransferResponse> {
    val ids = postTransferUC.execute(
      PostTransferCommand(
        fromAccountId = request.fromAccountId,
        toAccountId = request.toAccountId,
        postedDate = request.postedDate,
        effectiveDate = request.effectiveDate,
        amount = Money(request.amount, request.currency),
      ),
    )

    return ResponseEntity.status(HttpStatus.CREATED).body(TransferResponse(ids))
  }
}

data class PostTransferRequest(
  @field:NotNull
  val fromAccountId: UUID,
  @field:NotNull
  val toAccountId: UUID,
  @field:NotNull
  val postedDate: LocalDate,
  @field:NotNull
  val effectiveDate: LocalDate,
  @field:NotNull
  val amount: BigDecimal,
  @field:NotNull
  val currency: String,
)

data class TransferResponse(
  val transactionIds: List<UUID>,
)
