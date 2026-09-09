package com.gonezo.notifications.application

sealed interface SystemNotificationResult {
    data object Accepted : SystemNotificationResult
    data class Suppressed(val errorCode: String) : SystemNotificationResult
    data class Failed(val errorCode: String) : SystemNotificationResult
}

interface SystemNotificationSender {
    fun updateSummary(unreadCount: Int): SystemNotificationResult

    fun removeSummary()

    fun summaryExists(): Boolean
}
