package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.AccountHolderCreatedDto
import com.solidcoder.gonezo.account.api.dto.CreateAccountHolderDto
import com.solidcoder.gonezo.account.api.dto.ErrorDto
import com.solidcoder.gonezo.account.application.command.CreateAccountHolder
import com.solidcoder.gonezo.account.application.command.CreateAccountHolderResult
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/holders")
class AccountHolderController(
    private val createAccountHolder: CreateAccountHolder
) {

    @PostMapping
    fun create(@RequestBody dto: CreateAccountHolderDto): ResponseEntity<Any> {
        return when (val result = createAccountHolder.handle(dto.name)) {
            is CreateAccountHolderResult.Success ->
                ResponseEntity.status(HttpStatus.CREATED).body(AccountHolderCreatedDto(result.id))

            is CreateAccountHolderResult.InvalidAccountHolder ->
                ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorDto(result.reason))
        }
    }
}
