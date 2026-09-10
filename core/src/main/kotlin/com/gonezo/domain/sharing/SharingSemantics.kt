package com.gonezo.sharing.domain

enum class SharedMovementType {
    EXPENSE,
    INCOME,
}

enum class ShareAllocationMode {
    EQUAL,
    PARTS,
    AMOUNTS,
}

enum class ShareSettlementStatus {
    NOT_REQUIRED,
    PENDING,
    SETTLED,
}
