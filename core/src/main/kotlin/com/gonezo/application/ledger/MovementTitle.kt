package com.gonezo.ledger.application

fun displayedMovementTitle(merchant: String?, description: String?, fallback: String): String =
    merchant?.trim()?.takeIf(String::isNotEmpty)
        ?: description?.trim()?.takeIf(String::isNotEmpty)
        ?: fallback
