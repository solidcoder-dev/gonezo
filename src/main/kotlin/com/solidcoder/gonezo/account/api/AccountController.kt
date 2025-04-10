package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.api.mapper.TransactionDtoMapper
import com.solidcoder.gonezo.account.application.command.AddTransaction
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/accounts")
class AccountController(
    private val addTransaction: AddTransaction,
    private val transactionDtoMapper: TransactionDtoMapper
) {

    @PostMapping("/{id}/transactions")
    fun addTransaction(
        @PathVariable id: UUID,
        @RequestBody dto: CreateTransactionDto
    ): ResponseEntity<Void> {
        val transaction = transactionDtoMapper.toDomain(id, dto)
        addTransaction.handle(id, transaction)
        return ResponseEntity.status(HttpStatus.CREATED).build()
    }
}
