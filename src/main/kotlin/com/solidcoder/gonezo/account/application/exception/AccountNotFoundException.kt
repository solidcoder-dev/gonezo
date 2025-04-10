package com.solidcoder.gonezo.account.application.exception

import java.util.*

class AccountNotFoundException(id: UUID) : RuntimeException("Account $id not found")
