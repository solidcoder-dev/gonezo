package com.gonezo.notifications.domain

enum class NotificationType(val value: String) {
    SCHEDULED_CONFIRMATION_REQUIRED("scheduled_confirmation_required"),
    SCHEDULED_PROCESSING_FAILED("scheduled_processing_failed"),
    ;

    companion object {
        fun from(value: String): NotificationType = entries.firstOrNull { it.value == value.trim() }
            ?: throw IllegalArgumentException("Unsupported notification type: $value")
    }
}
