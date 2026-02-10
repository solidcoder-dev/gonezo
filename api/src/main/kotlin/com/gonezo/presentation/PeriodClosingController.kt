package com.gonezo.presentation

import com.gonezo.application.ClosePeriodCommand
import com.gonezo.application.ClosePeriodUC
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/budget-periods")
class PeriodClosingController(
  private val closePeriodUC: ClosePeriodUC,
) {

  @PostMapping("/{periodId}/close")
  fun close(@PathVariable periodId: UUID): ResponseEntity<Void> {
    closePeriodUC.execute(ClosePeriodCommand(periodId))
    return ResponseEntity.accepted().build()
  }
}
