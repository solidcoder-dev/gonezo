package com.gonezo.presentation

import com.gonezo.application.CreatePeriodReservationsCommand
import com.gonezo.application.CreatePeriodReservationsUC
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/budget-periods")
class PeriodReservationsController(
  private val createPeriodReservationsUC: CreatePeriodReservationsUC,
) {

  @PostMapping("/{periodId}/reservations")
  fun create(@PathVariable periodId: UUID): ResponseEntity<Void> {
    createPeriodReservationsUC.execute(CreatePeriodReservationsCommand(periodId))
    return ResponseEntity.accepted().build()
  }
}
