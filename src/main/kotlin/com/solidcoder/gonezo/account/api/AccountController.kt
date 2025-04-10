package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.api.dto.CreateAccountDto
import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.api.mapper.TransactionDtoMapper
import com.solidcoder.gonezo.account.application.command.AddTransaction
import com.solidcoder.gonezo.account.application.command.CreateAccount
import com.solidcoder.gonezo.account.domain.Currency
import java.util.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/accounts")
class AccountController(
    private val addTransaction: AddTransaction,
    private val transactionMapper: TransactionDtoMapper,
    private val createAccount: CreateAccount,
) {

    @PostMapping
    fun createAccount(@RequestBody dto: CreateAccountDto): ResponseEntity<AccountCreatedDto> {
        val currency = Currency(dto.currency)
        val result = createAccount.handle(dto.name, currency)
        return ResponseEntity.status(HttpStatus.CREATED).body(result)
    }

    @PostMapping("/{id}/transactions")
    fun addTransaction(
        @PathVariable id: UUID,
        @RequestBody dto: CreateTransactionDto
    ): ResponseEntity<Void> {
        val transaction = transactionMapper.toDomain(id, dto)
        addTransaction.handle(id, transaction)
        return ResponseEntity.status(HttpStatus.CREATED).build()
    }
}
