package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.api.dto.TransactionDto
import com.solidcoder.gonezo.account.api.mapper.TransactionDtoMapper
import com.solidcoder.gonezo.account.api.mapper.TransactionViewMapper
import com.solidcoder.gonezo.account.application.command.AddTransaction
import com.solidcoder.gonezo.account.application.query.GetTransactions
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
    ): ResponseEntity<Void> {
        val transaction = transactionDtoMapper.toDomain(accountId, dto)
        addTransaction.handle(accountId, transaction)
        return ResponseEntity.status(HttpStatus.CREATED).build()
    }

    @GetMapping
    fun getTransactions(
        @PathVariable accountId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int
    ): ResponseEntity<PageResult<TransactionDto>> {
        val pageRequest = PageRequest(page, size)
        val result = getTransactions.handle(accountId, pageRequest)
        val dtos = result.content.map(transactionViewMapper::toDto)

        return ResponseEntity.ok(
            PageResult(
                content = dtos,
                totalElements = result.totalElements,
                totalPages = result.totalPages,
                page = result.page,
                size = result.size
            )
        )
    }
}
