package com.solidcoder.gonezo.account.domain

@JvmInline
value class Currency(val code: String) {
    init {
        require(code.matches(Regex("[A-Z]{3}"))) {
            "Invalid currency code: $code"
        }
    }
}
