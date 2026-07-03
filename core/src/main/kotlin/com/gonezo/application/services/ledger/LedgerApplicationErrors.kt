package com.gonezo.ledger.application

import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.TransactionId

sealed class LedgerApplicationException(message: String) : IllegalStateException(message)

class LedgerAccountNotFound(accountId: AccountId) : LedgerApplicationException("Account not found: $accountId")

class LedgerTransactionNotFound(transactionId: TransactionId) : LedgerApplicationException("Transaction not found: $transactionId")
