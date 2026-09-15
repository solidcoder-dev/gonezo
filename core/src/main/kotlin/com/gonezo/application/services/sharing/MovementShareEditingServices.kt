package com.gonezo.sharing.application

import com.gonezo.analytics.domain.AnalyticsExclusion
import com.gonezo.analytics.domain.AnalyticsExclusionReason
import com.gonezo.analytics.domain.AnalyticsExclusionScopeType
import com.gonezo.analytics.domain.ports.AnalyticsExclusionRepository
import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.expected.domain.ExpectedMovementId
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
import com.gonezo.expected.application.CreateExpectedMovementCommand
import com.gonezo.expected.application.CreateExpectedMovementUC
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class ReplaceMovementShareService(
    private val transactions: LedgerTransactionRepository,
    private val people: SharingPersonRepository,
    private val shares: MovementShareRepository,
    private val expected: ExpectedMovementRepository,
    private val createExpected: CreateExpectedMovementUC,
    private val exclusions: AnalyticsExclusionRepository,
    private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : ReplaceMovementShareUC {
    override fun execute(command: ReplaceMovementShareCommand): ApplyShareToPostedMovementResult = consistencyBoundary.withinConsistencyBoundary {
        val transaction = transactions.findById(com.gonezo.ledger.domain.TransactionId.from(command.transactionId))
            ?: throw SharingTransactionNotFound(command.transactionId)
        require(transaction.status == TransactionStatus.POSTED) { "Only posted transactions can be shared" }
        require(transaction.type == TransactionType.EXPENSE || transaction.type == TransactionType.INCOME) { "Only expense and income transactions can be shared" }
        val previous = shares.findBySourceTransactionId(command.transactionId)
        if (command.participants.isEmpty()) {
            RemoveMovementShareService(transactions, shares, expected, exclusions, consistencyBoundary).execute(RemoveMovementShareCommand(command.transactionId, command.updatedAt))
            return@withinConsistencyBoundary ApplyShareToPostedMovementResult(previous?.id?.toString() ?: "", command.transactionId, emptyList())
        }
        val payer = resolvePerson(command.payer, command.updatedAt)
        val oldByPerson = previous?.participants?.associateBy { it.personId } ?: emptyMap()
        val next = command.participants.map { input ->
            val person = resolvePerson(input.person, command.updatedAt)
            val old = oldByPerson[person.id]
            val status = statusOf(input)
            validateSettledParticipant(old, status, input.amount)
            val expectedId = when (status) {
                ShareSettlementStatus.PENDING -> pendingExpected(transaction, person, old, input.amount, command.updatedAt)
                ShareSettlementStatus.NOT_REQUIRED -> null.also { dismissPending(old, command.updatedAt) }
                ShareSettlementStatus.SETTLED -> old?.expectedMovementId
            }
            ShareParticipant(old?.id ?: ShareParticipantId.random(), person.id, input.amount, status, expectedId, old?.settlementTransactionId)
        }
        previous?.participants.orEmpty().filter { old -> next.none { it.personId == old.personId } }.forEach { dismissPending(it, command.updatedAt) }
        val share = MovementShare(
            id = previous?.id ?: MovementShareId.random(), sourceTransactionId = command.transactionId,
            payerPersonId = payer.id, totalAmount = transaction.amount.amount, currency = transaction.amount.currency,
            participants = next, createdAt = previous?.createdAt ?: command.updatedAt, updatedAt = command.updatedAt,
            movementType = if (transaction.type == TransactionType.EXPENSE) SharedMovementType.EXPENSE else SharedMovementType.INCOME,
        )
        shares.save(share)
        rebuildExclusions(previous, share, command.updatedAt)
        ApplyShareToPostedMovementResult(share.id.toString(), command.transactionId, next.map { participant ->
            val person = people.findById(participant.personId) ?: error("Sharing person not found")
            AppliedShareParticipantResult(participant.id.toString(), person.id.toString(), person.displayName, participant.amount, participant.requiresSettlement, participant.expectedMovementId?.let(ExpectedMovementId::from), participant.settlementStatus)
        })
    }

    private fun statusOf(input: ApplyShareParticipantCommand) = when {
        input.amount.compareTo(BigDecimal.ZERO) == 0 -> ShareSettlementStatus.NOT_REQUIRED
        input.settlementStatus != null -> input.settlementStatus
        input.reimbursable -> ShareSettlementStatus.PENDING
        else -> ShareSettlementStatus.NOT_REQUIRED
    }

    private fun validateSettledParticipant(old: ShareParticipant?, status: ShareSettlementStatus, amount: BigDecimal) {
        if (old?.settlementStatus == ShareSettlementStatus.SETTLED && (old.amount.compareTo(amount) != 0 || status != ShareSettlementStatus.SETTLED)) {
            error("Published settlements cannot be changed")
        }
    }

    private fun pendingExpected(transaction: com.gonezo.ledger.domain.Transaction, person: SharingPerson, old: ShareParticipant?, amount: BigDecimal, at: Instant): String {
        val oldId = old?.expectedMovementId
        if (oldId != null) {
            val movement = expected.findById(ExpectedMovementId.from(oldId))
            if (movement != null) {
                expected.save(movement.update(movement.accountId, movement.type, amount, movement.currency, movement.expectedAt, movement.description, movement.merchant, movement.categoryId, movement.splitItems, movement.tagNames, at))
                return oldId
            }
        }
        return createExpected.execute(CreateExpectedMovementCommand(transaction.accountId.toString(), if (transaction.type == TransactionType.EXPENSE) "income" else "expense", amount, transaction.amount.currency, transaction.occurredAt, person.displayName, person.displayName, null, createdAt = at)).toString()
    }

    private fun dismissPending(old: ShareParticipant?, at: Instant) {
        val id = old?.expectedMovementId ?: return
        expected.findById(ExpectedMovementId.from(id))?.let { movement ->
            if (movement.status == com.gonezo.expected.domain.ExpectedMovementStatus.PENDING) expected.save(movement.dismiss(at))
        }
    }

    private fun resolvePerson(reference: SharingPersonReference, at: Instant): SharingPerson = when (reference) {
        SharingPersonReference.CurrentUser -> people.findByNormalizedName(SharingPerson.CURRENT_USER_NAME)
            ?: SharingPerson.create(SharingPersonId.random(), SharingPerson.CURRENT_USER_DISPLAY_NAME, at).also(people::save)
        is SharingPersonReference.Existing -> people.findById(SharingPersonId.from(reference.personId)) ?: error("Sharing person not found")
        is SharingPersonReference.New -> SharingPerson.create(SharingPersonId.random(), reference.displayName, at).also(people::save)
    }

    private fun rebuildExclusions(previous: MovementShare?, next: MovementShare, at: Instant) {
        previous?.participants.orEmpty().forEach { participant ->
            exclusions.deleteByScope(AnalyticsExclusionScopeType.SHARE_PARTICIPANT, participant.id.toString(), AnalyticsExclusionReason.SHARED_EXPENSE)
            participant.expectedMovementId?.let { exclusions.deleteByScope(AnalyticsExclusionScopeType.EXPECTED_MOVEMENT, it, AnalyticsExclusionReason.REIMBURSEMENT) }
        }
        next.participants.filter { it.requiresSettlement }.forEach { participant ->
            exclusions.save(AnalyticsExclusion(UUID.randomUUID(), AnalyticsExclusionScopeType.SHARE_PARTICIPANT, participant.id.toString(), AnalyticsExclusionReason.SHARED_EXPENSE, at))
            participant.expectedMovementId?.let { exclusions.save(AnalyticsExclusion(UUID.randomUUID(), AnalyticsExclusionScopeType.EXPECTED_MOVEMENT, it, AnalyticsExclusionReason.REIMBURSEMENT, at)) }
        }
    }
}

class RemoveMovementShareService(
    private val transactions: LedgerTransactionRepository,
    private val shares: MovementShareRepository,
    private val expected: ExpectedMovementRepository,
    private val exclusions: AnalyticsExclusionRepository,
    private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : RemoveMovementShareUC {
    override fun execute(command: RemoveMovementShareCommand) = consistencyBoundary.withinConsistencyBoundary {
        val transaction = transactions.findById(com.gonezo.ledger.domain.TransactionId.from(command.transactionId)) ?: throw SharingTransactionNotFound(command.transactionId)
        require(transaction.status == TransactionStatus.POSTED) { "Only posted transactions can be edited" }
        val share = shares.findBySourceTransactionId(command.transactionId) ?: return@withinConsistencyBoundary
        require(share.participants.none { it.settlementStatus == ShareSettlementStatus.SETTLED }) { "Published settlements cannot be deleted" }
        share.participants.forEach { participant ->
            participant.expectedMovementId?.let { id ->
                expected.findById(ExpectedMovementId.from(id))?.let { movement -> if (movement.status == com.gonezo.expected.domain.ExpectedMovementStatus.PENDING) expected.save(movement.dismiss(command.removedAt)) }
                exclusions.deleteByScope(AnalyticsExclusionScopeType.EXPECTED_MOVEMENT, id, AnalyticsExclusionReason.REIMBURSEMENT)
            }
            exclusions.deleteByScope(AnalyticsExclusionScopeType.SHARE_PARTICIPANT, participant.id.toString(), AnalyticsExclusionReason.SHARED_EXPENSE)
        }
        shares.deleteBySourceTransactionId(command.transactionId)
    }
}
