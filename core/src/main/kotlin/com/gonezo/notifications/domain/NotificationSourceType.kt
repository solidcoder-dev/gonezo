package com.gonezo.notifications.domain

enum class NotificationSourceType(val value: String) {
    EXPECTED("expected"),
    SCHEDULED("scheduled"),
    ;

    companion object {
        fun from(value: String): NotificationSourceType = entries.firstOrNull { it.value == value.trim() }
            ?: throw IllegalArgumentException("Unsupported notification source type: $value")
    }
}
