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
import com.gonezo.sharing.domain.ExpenseShare
import com.gonezo.sharing.domain.ExpenseShareId
import com.gonezo.sharing.domain.ShareParticipant
import com.gonezo.sharing.domain.ShareParticipantId
import com.gonezo.sharing.domain.SharingPerson
import com.gonezo.sharing.domain.SharingPersonId
import com.gonezo.sharing.domain.ports.ExpenseShareRepository
import com.gonezo.sharing.domain.ports.SharingPersonRepository
import java.math.BigDecimal
import java.util.UUID

class ApplyShareToPostedTransactionService(
  private val ledgerTransactionRepository: LedgerTransactionRepository,
  private val sharingPersonRepository: SharingPersonRepository,
  private val expenseShareRepository: ExpenseShareRepository,
  private val createExpectedMovementUC: CreateExpectedMovementUC,
  private val analyticsExclusionRepository: AnalyticsExclusionRepository,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : ApplyShareToPostedTransactionUC {
  override fun execute(command: ApplyShareToPostedTransactionCommand): ApplyShareToPostedTransactionResult =
    consistencyBoundary.withinConsistencyBoundary {
      val transaction = ledgerTransactionRepository.findById(com.gonezo.ledger.domain.TransactionId.from(command.transactionId))
        ?: throw IllegalStateException("Transaction not found: ${command.transactionId}")
      require(transaction.status == TransactionStatus.POSTED) { "Only posted transactions can be shared" }
      require(transaction.type == TransactionType.EXPENSE) { "Only expense transactions can be shared" }
      require(command.participants.isNotEmpty()) { "Share requires participants" }

      val payer = findOrCreatePerson(command.payerName, command.appliedAt)
      val participantRows = command.participants.map { participantCommand ->
        val person = findOrCreatePerson(participantCommand.personName, command.appliedAt)
        val expectedMovementId = if (participantCommand.reimbursable) {
          createExpectedMovementUC.execute(
            CreateExpectedMovementCommand(
              accountId = transaction.accountId.toString(),
              type = "income",
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
          reimbursable = participantCommand.reimbursable,
          expectedMovementId = expectedMovementId?.toString(),
        ) to person
      }

      val share = ExpenseShare(
        id = expenseShareRepository.findBySourceTransactionId(command.transactionId)?.id ?: ExpenseShareId.random(),
        sourceTransactionId = command.transactionId,
        payerPersonId = payer.id,
        totalAmount = transaction.amount.amount,
        currency = transaction.amount.currency,
        participants = participantRows.map { it.first },
        createdAt = command.appliedAt,
        updatedAt = command.appliedAt,
      )
      expenseShareRepository.save(share)
      createAnalyticsExclusions(share, command.appliedAt)

      ApplyShareToPostedTransactionResult(
        shareId = share.id.toString(),
        transactionId = command.transactionId,
        participants = participantRows.map { (participant, person) ->
          AppliedShareParticipantResult(
            participantId = participant.id.toString(),
            personId = person.id.toString(),
            displayName = person.displayName,
            amount = participant.amount,
            reimbursable = participant.reimbursable,
            expectedMovementId = participant.expectedMovementId?.let(ExpectedMovementId::from),
          )
        },
      )
    }

  private fun findOrCreatePerson(name: String, createdAt: java.time.Instant): SharingPerson {
    val normalizedName = SharingPerson.normalizeName(name)
    return sharingPersonRepository.findByNormalizedName(normalizedName)
      ?: SharingPerson.create(
        id = SharingPersonId.random(),
        displayName = name,
        createdAt = createdAt,
      ).also(sharingPersonRepository::save)
  }

  private fun createAnalyticsExclusions(share: ExpenseShare, createdAt: java.time.Instant) {
    share.participants
      .filter { it.reimbursable }
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

class GetMovementSharingDetailsService(
  private val ledgerTransactionRepository: LedgerTransactionRepository,
  private val sharingPersonRepository: SharingPersonRepository,
  private val expenseShareRepository: ExpenseShareRepository,
  private val expectedMovementRepository: ExpectedMovementRepository,
) : GetMovementSharingDetailsUC {
  override fun execute(query: GetMovementSharingDetailsQuery): MovementSharingDetailsView? {
    val share = expenseShareRepository.findBySourceTransactionId(query.transactionId) ?: return null
    val transaction = ledgerTransactionRepository.findById(com.gonezo.ledger.domain.TransactionId.from(query.transactionId))
      ?: throw IllegalStateException("Transaction not found: ${query.transactionId}")
    val peopleById = sharingPersonRepository.listActive().associateBy { it.id }
    val participants = share.participants.map { participant ->
      val expected = participant.expectedMovementId?.let { expectedMovementRepository.findById(ExpectedMovementId.from(it)) }
      MovementShareParticipantView(
        participantId = participant.id.toString(),
        personId = participant.personId.toString(),
        displayName = peopleById.getValue(participant.personId).displayName,
        amount = participant.amount,
        reimbursable = participant.reimbursable,
        expectedMovementId = participant.expectedMovementId,
        repaymentStatus = repaymentStatus(participant.reimbursable, expected?.status),
      )
    }
    val excludedLentAmount = share.participants
      .filter { it.reimbursable }
      .fold(BigDecimal.ZERO) { total, participant -> total + participant.amount }
    val excludedReimbursementIncomeAmount = share.participants
      .filter { participant ->
        participant.reimbursable &&
          participant.expectedMovementId?.let { expectedMovementRepository.findById(ExpectedMovementId.from(it))?.status } == ExpectedMovementStatus.RESOLVED
      }
      .fold(BigDecimal.ZERO) { total, participant -> total + participant.amount }

    return MovementSharingDetailsView(
      shareId = share.id.toString(),
      transactionId = query.transactionId,
      participants = participants,
      analytics = MovementSharingAnalyticsView(
        personalExpenseAmount = transaction.amount.amount - excludedLentAmount,
        excludedLentAmount = excludedLentAmount,
        excludedReimbursementIncomeAmount = excludedReimbursementIncomeAmount,
      ),
    )
  }

  private fun repaymentStatus(reimbursable: Boolean, expectedStatus: ExpectedMovementStatus?): String =
    when {
      !reimbursable -> "not_expected"
      expectedStatus == ExpectedMovementStatus.PENDING -> "pending"
      expectedStatus == ExpectedMovementStatus.RESOLVED -> "paid"
      expectedStatus == ExpectedMovementStatus.DISMISSED -> "dismissed"
      else -> "missing_expected"
    }
}
