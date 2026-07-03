package com.gonezo.expected.application

import com.gonezo.expected.domain.ExpectedMovementId

sealed class ExpectedMovementApplicationException(message: String) : IllegalStateException(message)

class ExpectedMovementNotFound(expectedMovementId: ExpectedMovementId) :
  ExpectedMovementApplicationException("Expected movement not found: $expectedMovementId")
