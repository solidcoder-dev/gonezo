package com.gonezo.presentation

import com.gonezo.application.AllocateBudgetCommand
import com.gonezo.application.AllocateBudgetUC
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/budget-periods")
class BudgetAllocationController(
  private val allocateBudgetUC: AllocateBudgetUC,
) {

  @PostMapping("/{periodId}/allocate")
  fun allocate(@PathVariable periodId: UUID): ResponseEntity<Void> {
    allocateBudgetUC.execute(AllocateBudgetCommand(periodId))
    return ResponseEntity.accepted().build()
  }
}
