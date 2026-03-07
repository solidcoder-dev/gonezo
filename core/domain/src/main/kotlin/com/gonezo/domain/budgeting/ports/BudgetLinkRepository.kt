package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.BudgetLink

interface BudgetLinkRepository {
  fun save(link: BudgetLink)
}
