package com.gonezo.application

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
class PolicyViolationException(message: String) : RuntimeException(message)
