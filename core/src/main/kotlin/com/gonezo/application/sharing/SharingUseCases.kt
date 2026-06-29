package com.gonezo.sharing.application

import com.gonezo.expected.domain.ExpectedMovementId
import java.math.BigDecimal
import java.time.Instant

data class ApplyShareParticipantCommand(
  val personName: String,
  val amount: BigDecimal,
  val reimbursable: Boolean,
)

data class ApplyShareToPostedTransactionCommand(
  val transactionId: String,
  val payerName: String,
  val participants: List<ApplyShareParticipantCommand>,
  val appliedAt: Instant,
)

data class AppliedShareParticipantResult(
  val participantId: String,
  val personId: String,
  val displayName: String,
  val amount: BigDecimal,
  val reimbursable: Boolean,
  val expectedMovementId: ExpectedMovementId?,
)

data class ApplyShareToPostedTransactionResult(
  val shareId: String,
  val transactionId: String,
  val participants: List<AppliedShareParticipantResult>,
)

interface ApplyShareToPostedTransactionUC {
  fun execute(command: ApplyShareToPostedTransactionCommand): ApplyShareToPostedTransactionResult
}

data class GetMovementSharingDetailsQuery(
  val transactionId: String,
)

data class MovementSharingDetailsView(
  val shareId: String,
  val transactionId: String,
  val participants: List<MovementShareParticipantView>,
  val analytics: MovementSharingAnalyticsView,
)

data class MovementShareParticipantView(
  val participantId: String,
  val personId: String,
  val displayName: String,
  val amount: BigDecimal,
  val reimbursable: Boolean,
  val expectedMovementId: String?,
  val repaymentStatus: String,
)

data class MovementSharingAnalyticsView(
  val personalExpenseAmount: BigDecimal,
  val excludedLentAmount: BigDecimal,
  val excludedReimbursementIncomeAmount: BigDecimal,
)

interface GetMovementSharingDetailsUC {
  fun execute(query: GetMovementSharingDetailsQuery): MovementSharingDetailsView?
}
