package com.gonezo.presentation

import com.gonezo.domain.shared.PolicyViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ApiExceptionHandler {

  @ExceptionHandler(PolicyViolationException::class)
  fun handlePolicyViolation(ex: PolicyViolationException): ResponseEntity<Map<String, String>> {
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
      .body(mapOf("message" to (ex.message ?: "Policy violation")))
  }
}
