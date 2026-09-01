package com.gonezo.application.orchestration.backup

import com.gonezo.application.backup.contract.*

object BackupIdentifierValidator {
    fun validate(sections: Map<BackupSectionId, BackupSection>) {
        val seen = mutableSetOf<Pair<String, String>>()
        sections.values.flatMap { it.references() }.forEach { reference ->
            if (!seen.add(reference.scope to reference.id)) {
                throw BackupImportException(BackupErrorCode.INVALID_DATA, "Duplicate ${reference.scope} id ${reference.id}")
            }
        }
    }

    private val BackupReference.scope: String
        get() = when (this) {
            is BackupReference.Account -> "account"
            is BackupReference.Category -> "category"
            is BackupReference.Tag -> "tag"
            is BackupReference.Movement -> "movement"
            is BackupReference.SplitItem -> "split item"
            is BackupReference.RecurringSplitItem -> "recurring split item"
            is BackupReference.ExpectedSplitItem -> "expected split item"
            is BackupReference.ShareParticipant -> "share participant"
            is BackupReference.RecurringShareParticipant -> "recurring share participant"
            is BackupReference.PlannedShareParticipant -> "planned share participant"
            is BackupReference.RecurringMovement -> "recurring movement"
            is BackupReference.RecurringOccurrence -> "recurrence occurrence"
            is BackupReference.ExpectedMovement -> "expected movement"
            is BackupReference.SharingPerson -> "sharing person"
            is BackupReference.ExpenseShare -> "expense share"
            is BackupReference.RecurringSharePlan -> "recurring share plan"
            is BackupReference.PlannedExpenseShare -> "planned expense share"
            is BackupReference.AnalyticsExclusion -> "analytics exclusion"
        }
}
