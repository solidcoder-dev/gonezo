package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.api.dto.BalanceDto
import com.solidcoder.gonezo.account.api.dto.CreateAccountDto
import com.solidcoder.gonezo.account.application.command.CreateAccount
import com.solidcoder.gonezo.account.application.query.GetBalance
import com.solidcoder.gonezo.account.domain.Currency
import java.util.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/accounts")
class AccountController(
    private val getBalance: GetBalance,
    private val createAccount: CreateAccount,
) {

    @PostMapping
    fun createAccount(@RequestBody dto: CreateAccountDto): ResponseEntity<AccountCreatedDto> {
        val currency = Currency(dto.currency)
        val result = createAccount.handle(dto.name, currency)
        return ResponseEntity.status(HttpStatus.CREATED).body(result)
    }

    @GetMapping("/{id}/balance")
    fun getBalance(@PathVariable id: UUID): ResponseEntity<BalanceDto> {
        val result = getBalance.handle(id)
        return ResponseEntity.ok(
            BalanceDto(
                accountId = result.accountId,
                balance = result.amount,
                currency = result.currency.code
            )
        )
    }
}
