package com.gonezo.expected.domain.ports

import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId

interface ExpectedMovementRepository {
  fun save(movement: ExpectedMovement)

  fun findById(id: ExpectedMovementId): ExpectedMovement?

  fun findByOriginOccurrenceId(originOccurrenceId: String): ExpectedMovement?

  fun listByAccount(accountId: String, includeClosed: Boolean): List<ExpectedMovement>
}
