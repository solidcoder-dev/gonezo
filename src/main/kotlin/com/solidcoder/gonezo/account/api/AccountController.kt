package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.CreateAccountDto
import com.solidcoder.gonezo.account.api.dto.ErrorDto
import com.solidcoder.gonezo.account.api.mapper.AccountDtoMapper
import com.solidcoder.gonezo.account.api.mapper.BalanceDtoMapper
import com.solidcoder.gonezo.account.application.command.CreateAccount
import com.solidcoder.gonezo.account.application.command.CreateAccountResult
import com.solidcoder.gonezo.account.application.query.GetBalance
import com.solidcoder.gonezo.account.application.query.GetBalanceResult
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
@RequestMapping("/holders/{holderId}/accounts")
class AccountController(
    private val getBalance: GetBalance,
    private val createAccount: CreateAccount,
    private val accountMapper: AccountDtoMapper,
    private val balanceDtoMapper: BalanceDtoMapper
) {

    @PostMapping
    fun createAccount(
        @PathVariable holderId: UUID,
        @RequestBody dto: CreateAccountDto
    ): ResponseEntity<Any> {
        return when (val result = createAccount.handle(holderId, dto.name, dto.currency)) {
            is CreateAccountResult.Success ->
                ResponseEntity.status(HttpStatus.CREATED).body(accountMapper.toCreatedDto(result.account))

            is CreateAccountResult.ValidationFailed ->
                ResponseEntity.badRequest().body(ErrorDto(result.reason))

            is CreateAccountResult.NonExistentAccountHolder ->
                ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorDto("Account Holder ${result.holderId} does not exist"))

        }
    }

    @GetMapping("/{accountId}/balance")
    fun getBalance(
        @PathVariable holderId: UUID,
        @PathVariable accountId: UUID
    ): ResponseEntity<Any> {
        return when (val result = getBalance.handle(accountId)) {
            is GetBalanceResult.Success ->
                ResponseEntity.ok(balanceDtoMapper.toBalanceDto(result.balance))

            is GetBalanceResult.NonExistentAccount ->
                ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorDto("Account ${result.accountId} does not exist"))
        }
    }
}
