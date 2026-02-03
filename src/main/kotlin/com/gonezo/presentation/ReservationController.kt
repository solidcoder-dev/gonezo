package com.gonezo.presentation

import com.gonezo.application.SettleReservationFromTxCommand
import com.gonezo.application.SettleReservationFromTxUC
import jakarta.validation.Valid
import jakarta.validation.constraints.NotNull
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/reservations")
class ReservationController(
  private val settleReservationFromTxUC: SettleReservationFromTxUC,
) {

  @PostMapping("/{reservationId}/settle")
  fun settle(
    @PathVariable reservationId: UUID,
    @Valid @RequestBody request: SettleReservationRequest,
  ): ResponseEntity<Void> {
    settleReservationFromTxUC.execute(
      SettleReservationFromTxCommand(
        reservationId = reservationId,
        transactionId = request.transactionId,
      ),
    )

    return ResponseEntity.noContent().build()
  }
}

data class SettleReservationRequest(
  @field:NotNull
  val transactionId: UUID,
)
