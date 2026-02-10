package com.gonezo.presentation

import com.gonezo.application.CreateAccountCommand
import com.gonezo.application.CreateAccountUC
import com.gonezo.domain.cashledger.AccountType
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/accounts")
class AccountController(
  private val createAccountUC: CreateAccountUC,
) {

  @PostMapping
  fun createAccount(@Valid @RequestBody request: CreateAccountRequest): ResponseEntity<CreateAccountResponse> {
    val accountType = try {
      AccountType.from(request.type)
    } catch (ex: IllegalArgumentException) {
      throw ResponseStatusException(HttpStatus.BAD_REQUEST, ex.message)
    }

    val id = createAccountUC.execute(
      CreateAccountCommand(
        userId = request.userId,
        name = request.name,
        type = accountType,
        currency = request.currency,
      ),
    )

    return ResponseEntity.status(HttpStatus.CREATED).body(CreateAccountResponse(id))
  }
}

data class CreateAccountRequest(
  @field:NotNull
  val userId: UUID,
  @field:NotBlank
  val name: String,
  @field:NotBlank
  val type: String,
  @field:NotBlank
  val currency: String,
)

data class CreateAccountResponse(
  val id: UUID,
)
