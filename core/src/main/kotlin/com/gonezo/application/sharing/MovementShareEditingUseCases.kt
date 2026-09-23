package com.gonezo.sharing.application

import java.time.Instant

data class ReplaceMovementShareCommand(val transactionId: String, val payer: SharingPersonReference, val participants: List<ApplyShareParticipantCommand>, val updatedAt: Instant)

interface ReplaceMovementShareUC {
    fun execute(command: ReplaceMovementShareCommand): ApplyShareToPostedMovementResult
}

data class RemoveMovementShareCommand(val transactionId: String, val removedAt: Instant)

interface RemoveMovementShareUC {
    fun execute(command: RemoveMovementShareCommand)
}
