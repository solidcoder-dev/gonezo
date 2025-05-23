package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.api.dto.ErrorDto
import com.solidcoder.gonezo.account.api.mapper.TransactionDtoMapper
import com.solidcoder.gonezo.account.api.mapper.TransactionViewMapper
import com.solidcoder.gonezo.account.application.command.AddTransaction
import com.solidcoder.gonezo.account.application.command.AddTransactionResult
import com.solidcoder.gonezo.account.application.query.GetTransactions
import com.solidcoder.gonezo.account.application.query.GetTransactionsResult
import com.solidcoder.gonezo.shared.pagination.PageRequest
import com.solidcoder.gonezo.shared.pagination.PageResult
import java.util.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController


@RestController
@RequestMapping("/accounts/{accountId}/transactions")
class TransactionController(
    private val addTransaction: AddTransaction,
    private val getTransactions: GetTransactions,
    private val transactionDtoMapper: TransactionDtoMapper,
    private val transactionViewMapper: TransactionViewMapper
) {

    @PostMapping
    fun addTransaction(
        @PathVariable accountId: UUID,
        @RequestBody dto: CreateTransactionDto
    ): ResponseEntity<Any> {
        val transaction = transactionDtoMapper.toDomain(accountId, dto)
        return when (val result = addTransaction.handle(accountId, transaction)) {
            is AddTransactionResult.Success ->
                ResponseEntity.status(HttpStatus.CREATED).build()

            is AddTransactionResult.AccountNotFound ->
                ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorDto("Account ${result.accountId} not found"))

            is AddTransactionResult.ValidationFailed ->
                ResponseEntity.badRequest().body(ErrorDto(result.reason))
        }
    }

    @GetMapping
    fun getTransactions(
        @PathVariable accountId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int
    ): ResponseEntity<Any> {
        val pageRequest = PageRequest(page, size)
        return when (val result = getTransactions.handle(accountId, pageRequest)) {
            is GetTransactionsResult.Success -> {
                with(result.transactionPage) {
                    ResponseEntity.ok(
                        PageResult(
                            content = content.map(transactionViewMapper::toDto),
                            totalElements = totalElements,
                            totalPages = totalPages,
                            page = page,
                            size = size
                        )
                    )
                }
            }

            is GetTransactionsResult.AccountNotFound ->
                ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorDto("Account ${result.accountId} not found"))
        }
    }
}
