package com.gonezo.application

import com.gonezo.domain.shared.Money
import java.time.LocalDate
import java.util.UUID

data class PostTransferCommand(
  val fromAccountId: UUID,
  val toAccountId: UUID,
  val postedDate: LocalDate,
  val effectiveDate: LocalDate,
  val amount: Money,
  val fromCategoryId: UUID?,
  val toCategoryId: UUID?,
)

interface PostTransferUC {
  fun execute(command: PostTransferCommand): List<UUID>
}
