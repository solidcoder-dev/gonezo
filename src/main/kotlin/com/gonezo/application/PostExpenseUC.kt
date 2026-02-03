package com.gonezo.application

import com.gonezo.domain.shared.Money
import java.time.LocalDate
import java.util.UUID

data class PostExpenseCommand(
  val accountId: UUID,
  val postedDate: LocalDate,
  val effectiveDate: LocalDate,
  val amount: Money,
  val merchant: String?,
  val categoryId: UUID?,
  val recurring: Boolean,
)

interface PostExpenseUC {
  fun execute(command: PostExpenseCommand): UUID
}
