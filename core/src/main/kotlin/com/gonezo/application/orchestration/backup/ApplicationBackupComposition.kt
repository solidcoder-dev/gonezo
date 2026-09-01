package com.gonezo.application.orchestration.backup

import com.gonezo.analytics.domain.ports.AnalyticsExclusionRepository
import com.gonezo.application.ConsistencyBoundary
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.preferences.domain.PreferencesOwnerId
import com.gonezo.preferences.domain.ports.UserPreferencesRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.sharing.domain.ports.ExpenseShareRepository
import com.gonezo.sharing.domain.ports.PlannedExpenseShareRepository
import com.gonezo.sharing.domain.ports.RecurringSharePlanRepository
import com.gonezo.sharing.domain.ports.SharingPersonRepository
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import com.gonezo.expected.application.backup.ExpectedBackupSectionExporter
import com.gonezo.expected.application.backup.ExpectedBackupSectionImporter
import com.gonezo.recurrence.application.backup.RecurrenceBackupSectionExporter
import com.gonezo.recurrence.application.backup.RecurrenceBackupSectionImporter
import java.time.Instant

class ApplicationBackupComposition(
    categoryRepository: CategoryRepository,
    tagRepository: TagRepository,
    accountRepository: LedgerAccountRepository,
    transactionRepository: LedgerTransactionRepository,
    categoryAssignmentRepository: TransactionCategoryAssignmentRepository,
    tagAssignmentRepository: TransactionTagAssignmentRepository,
    recurringMovementRepository: RecurringMovementRepository,
    recurringOccurrenceRepository: RecurringMovementOccurrenceRepository,
    expectedMovementRepository: ExpectedMovementRepository,
    sharingPersonRepository: SharingPersonRepository,
    expenseShareRepository: ExpenseShareRepository,
    recurringPlanRepository: RecurringSharePlanRepository,
    plannedShareRepository: PlannedExpenseShareRepository,
    analyticsExclusionRepository: AnalyticsExclusionRepository,
    preferencesRepository: UserPreferencesRepository,
    preferencesOwnerId: PreferencesOwnerId,
    consistencyBoundary: ConsistencyBoundary,
    portableStateReset: PortableStateReset = PortableStateReset { },
) {
    private val exporters: Set<BackupSectionExporter> = setOf(
        TaxonomyBackupSectionExporter(categoryRepository, tagRepository),
        LedgerBackupSectionExporter(accountRepository, transactionRepository, categoryAssignmentRepository, tagAssignmentRepository),
        RecurrenceBackupSectionExporter(accountRepository, recurringMovementRepository, recurringOccurrenceRepository),
        ExpectedBackupSectionExporter(accountRepository, expectedMovementRepository),
        SharingBackupSectionExporter(sharingPersonRepository, expenseShareRepository, recurringPlanRepository, plannedShareRepository),
        AnalyticsBackupSectionExporter(analyticsExclusionRepository),
        PreferencesBackupSectionExporter(preferencesRepository, preferencesOwnerId),
    )

    private val importers: Set<BackupSectionImporter> = setOf(
        TaxonomyBackupSectionImporter(categoryRepository, tagRepository),
        LedgerBackupSectionImporter(accountRepository, transactionRepository, categoryAssignmentRepository, tagAssignmentRepository),
        RecurrenceBackupSectionImporter(recurringMovementRepository, recurringOccurrenceRepository),
        ExpectedBackupSectionImporter(expectedMovementRepository),
        SharingBackupSectionImporter(sharingPersonRepository, expenseShareRepository, recurringPlanRepository, plannedShareRepository),
        AnalyticsBackupSectionImporter(analyticsExclusionRepository),
        PreferencesBackupSectionImporter(preferencesRepository, preferencesOwnerId),
    )

    private val coordinator = ApplicationBackupCoordinator(exporters, importers, consistencyBoundary, portableStateReset)

    fun export(createdAt: Instant): ApplicationBackupDocument = coordinator.export(createdAt)

    fun import(document: ApplicationBackupDocument, importedAt: Instant) = coordinator.import(document, importedAt)
}
