package com.gonezo.sharing.application

import com.gonezo.analytics.domain.AnalyticsExclusion
import com.gonezo.analytics.domain.AnalyticsExclusionReason
import com.gonezo.analytics.domain.AnalyticsExclusionScopeType
import com.gonezo.analytics.domain.ports.AnalyticsExclusionRepository
import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.expected.application.CreateExpectedMovementCommand
import com.gonezo.expected.application.CreateExpectedMovementUC
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.ledger.domain.TransactionStatus
import com.gonezo.ledger.domain.TransactionType
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.sharing.domain.MovementShare
import com.gonezo.sharing.domain.MovementShareId
import com.gonezo.sharing.domain.ShareParticipant
import com.gonezo.sharing.domain.ShareParticipantId
import com.gonezo.sharing.domain.ShareSettlementStatus
import com.gonezo.sharing.domain.SharingPerson
import com.gonezo.sharing.domain.SharingPersonId
import com.gonezo.sharing.domain.SharedMovementType
import com.gonezo.sharing.domain.ports.MovementShareRepository
import com.gonezo.sharing.domain.ports.SharingPersonRepository
import java.math.BigDecimal
import java.util.UUID

class ApplyShareToPostedMovementService(private val ledgerTransactionRepository: LedgerTransactionRepository, private val sharingPersonRepository: SharingPersonRepository, private val movementShareRepository: MovementShareRepository, private val createExpectedMovementUC: CreateExpectedMovementUC, private val analyticsExclusionRepository: AnalyticsExclusionRepository, private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary) : ApplyShareToPostedMovementUC {
    override fun execute(command: ApplyShareToPostedMovementCommand): ApplyShareToPostedMovementResult = consistencyBoundary.withinConsistencyBoundary {
        val transaction =
            ledgerTransactionRepository.findById(
                com.gonezo.ledger.domain.TransactionId
                    .from(command.transactionId),
            )
                ?: throw SharingTransactionNotFound(command.transactionId)
        require(transaction.status == TransactionStatus.POSTED) { "Only posted transactions can be shared" }
        require(transaction.type == TransactionType.EXPENSE || transaction.type == TransactionType.INCOME) {
            "Only expense and income transactions can be shared"
        }
        require(command.participants.isNotEmpty()) { "Share requires participants" }

        val payer = resolvePerson(command.payer, command.appliedAt)
        val participantRows =
            command.participants.map { participantCommand ->
                val person = resolvePerson(participantCommand.person, command.appliedAt)
                val expectedMovementId =
                    if (participantCommand.reimbursable) {
                        createExpectedMovementUC.execute(
                            CreateExpectedMovementCommand(
                                accountId = transaction.accountId.toString(),
                                type = if (transaction.type == TransactionType.EXPENSE) "income" else "expense",
                                amount = participantCommand.amount,
                                currency = transaction.amount.currency,
                                expectedAt = transaction.occurredAt,
                                description = "Reimbursement from ${person.displayName}",
                                merchant = person.displayName,
                                categoryId = null,
                                createdAt = command.appliedAt,
                            ),
                        )
                    } else {
                        null
                    }
                ShareParticipant(
                    id = ShareParticipantId.random(),
                    personId = person.id,
                    amount = participantCommand.amount,
                    settlementStatus = if (participantCommand.reimbursable) ShareSettlementStatus.PENDING else ShareSettlementStatus.NOT_REQUIRED,
                    expectedMovementId = expectedMovementId?.toString(),
                ) to person
            }

        val share =
            MovementShare(
                id = movementShareRepository.findBySourceTransactionId(command.transactionId)?.id ?: MovementShareId.random(),
                sourceTransactionId = command.transactionId,
                payerPersonId = payer.id,
                totalAmount = transaction.amount.amount,
                currency = transaction.amount.currency,
                participants = participantRows.map { it.first },
                createdAt = command.appliedAt,
                updatedAt = command.appliedAt,
                movementType = if (transaction.type == TransactionType.EXPENSE) SharedMovementType.EXPENSE else SharedMovementType.INCOME,
            )
        movementShareRepository.save(share)
        createAnalyticsExclusions(share, command.appliedAt)

        ApplyShareToPostedMovementResult(
            shareId = share.id.toString(),
            transactionId = command.transactionId,
            participants =
            participantRows.map { (participant, person) ->
                AppliedShareParticipantResult(
                    participantId = participant.id.toString(),
                    personId = person.id.toString(),
                    displayName = person.displayName,
                    amount = participant.amount,
                    reimbursable = participant.requiresSettlement,
                    expectedMovementId = participant.expectedMovementId?.let(ExpectedMovementId::from),
                )
            },
        )
    }

    private fun resolvePerson(reference: SharingPersonReference, createdAt: java.time.Instant): SharingPerson = when (reference) {
        is SharingPersonReference.Existing -> sharingPersonRepository.findById(SharingPersonId.from(reference.personId))
            ?: throw IllegalArgumentException("Sharing person not found: ${reference.personId}")
        is SharingPersonReference.New -> {
            val normalizedName = SharingPerson.normalizeName(reference.displayName)
            require(sharingPersonRepository.findByNormalizedName(normalizedName) == null) {
                "Sharing person already exists: ${reference.displayName}"
            }
            SharingPerson.create(SharingPersonId.random(), reference.displayName, createdAt).also(sharingPersonRepository::save)
        }
    }

    private fun createAnalyticsExclusions(share: MovementShare, createdAt: java.time.Instant) {
        share.participants
            .filter { it.requiresSettlement }
            .forEach { participant ->
                analyticsExclusionRepository.save(
                    AnalyticsExclusion(
                        id = UUID.randomUUID(),
                        scopeType = AnalyticsExclusionScopeType.SHARE_PARTICIPANT,
                        scopeId = participant.id.toString(),
                        reason = AnalyticsExclusionReason.SHARED_EXPENSE,
                        createdAt = createdAt,
                    ),
                )
                val expectedMovementId = participant.expectedMovementId
                if (expectedMovementId != null) {
                    analyticsExclusionRepository.save(
                        AnalyticsExclusion(
                            id = UUID.randomUUID(),
                            scopeType = AnalyticsExclusionScopeType.EXPECTED_MOVEMENT,
                            scopeId = expectedMovementId,
                            reason = AnalyticsExclusionReason.REIMBURSEMENT,
                            createdAt = createdAt,
                        ),
                    )
                }
            }
    }
}

class GetMovementSharingDetailsService(private val ledgerTransactionRepository: LedgerTransactionRepository, private val sharingPersonRepository: SharingPersonRepository, private val movementShareRepository: MovementShareRepository, private val expectedMovementRepository: ExpectedMovementRepository) : GetMovementSharingDetailsUC {
    override fun execute(query: GetMovementSharingDetailsQuery): MovementSharingDetailsView? {
        val share = movementShareRepository.findBySourceTransactionId(query.transactionId) ?: return null
        val transaction =
            ledgerTransactionRepository.findById(
                com.gonezo.ledger.domain.TransactionId
                    .from(query.transactionId),
            )
                ?: throw SharingTransactionNotFound(query.transactionId)
        val peopleById = sharingPersonRepository.listActive().associateBy { it.id }
        val participants =
            share.participants.map { participant ->
                val expected = participant.expectedMovementId?.let { expectedMovementRepository.findById(ExpectedMovementId.from(it)) }
                MovementShareParticipantView(
                    participantId = participant.id.toString(),
                    personId = participant.personId.toString(),
                    displayName = peopleById.getValue(participant.personId).displayName,
                    amount = participant.amount,
                    reimbursable = participant.requiresSettlement,
                    expectedMovementId = participant.expectedMovementId,
                    repaymentStatus = repaymentStatus(participant.requiresSettlement, expected?.status),
                )
            }
        val excludedLentAmount =
            share.participants
                .filter { it.requiresSettlement }
                .fold(BigDecimal.ZERO) { total, participant -> total + participant.amount }
        val resolvedThirdPartyAmount =
            share.participants
                .filter { participant ->
                    participant.requiresSettlement &&
                        participant.expectedMovementId?.let { expectedMovementRepository.findById(ExpectedMovementId.from(it))?.status } ==
                        ExpectedMovementStatus.RESOLVED
                }.fold(BigDecimal.ZERO) { total, participant -> total + participant.amount }

        val pendingThirdPartyAmount = share.participants
            .filter { it.requiresSettlement && it.expectedMovementId?.let { id -> expectedMovementRepository.findById(ExpectedMovementId.from(id))?.status } == ExpectedMovementStatus.PENDING }
            .fold(BigDecimal.ZERO) { total, participant -> total + participant.amount }
        return MovementSharingDetailsView(
            shareId = share.id.toString(),
            transactionId = query.transactionId,
            movementType = share.movementType,
            participants = participants,
            analytics =
            MovementSharingAnalyticsView(
                personalExpenseAmount = if (share.movementType == SharedMovementType.EXPENSE) transaction.amount.amount - excludedLentAmount else BigDecimal.ZERO,
                excludedLentAmount = excludedLentAmount,
                excludedReimbursementIncomeAmount = if (share.movementType == SharedMovementType.EXPENSE) resolvedThirdPartyAmount else BigDecimal.ZERO,
                personalIncomeAmount = if (share.movementType == SharedMovementType.INCOME) transaction.amount.amount - excludedLentAmount else BigDecimal.ZERO,
                pendingToCollect = if (share.movementType == SharedMovementType.EXPENSE) pendingThirdPartyAmount else BigDecimal.ZERO,
                pendingToPayOut = if (share.movementType == SharedMovementType.INCOME) pendingThirdPartyAmount else BigDecimal.ZERO,
                collected = if (share.movementType == SharedMovementType.EXPENSE) resolvedThirdPartyAmount else BigDecimal.ZERO,
                paidOut = if (share.movementType == SharedMovementType.INCOME) resolvedThirdPartyAmount else BigDecimal.ZERO,
            ),
        )
    }

    private fun repaymentStatus(reimbursable: Boolean, expectedStatus: ExpectedMovementStatus?): String = when {
        !reimbursable -> "not_expected"
        expectedStatus == ExpectedMovementStatus.PENDING -> "pending"
        expectedStatus == ExpectedMovementStatus.RESOLVED -> "paid"
        expectedStatus == ExpectedMovementStatus.DISMISSED -> "dismissed"
        else -> "missing_expected"
    }
}
