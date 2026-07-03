package com.gonezo.sharing.application

sealed class SharingApplicationException(message: String) : IllegalStateException(message)

class SharingTransactionNotFound(transactionId: String) :
  SharingApplicationException("Transaction not found: $transactionId")
