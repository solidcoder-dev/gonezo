package com.gonezo.multiplatform.core;

import com.gonezo.application.SettleReservationFromTxCommand;
import com.gonezo.application.SettleReservationFromTxUC;
import com.gonezo.domain.budgeting.BudgetLink;
import com.gonezo.domain.budgeting.BudgetPeriod;
import com.gonezo.domain.budgeting.BudgetPlan;
import com.gonezo.domain.budgeting.BudgetReservation;
import com.gonezo.domain.budgeting.Category;
import com.gonezo.domain.budgeting.CategoryBalance;
import com.gonezo.domain.budgeting.RecurringPattern;
import com.gonezo.domain.budgeting.ports.BudgetLinkRepository;
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository;
import com.gonezo.domain.budgeting.ports.BudgetPlanRepository;
import com.gonezo.domain.budgeting.ports.BudgetReservationRepository;
import com.gonezo.domain.budgeting.ports.CategoryBalanceRepository;
import com.gonezo.domain.budgeting.ports.CategoryRepository;
import com.gonezo.domain.budgeting.ports.RecurringPatternRepository;
import com.gonezo.domain.shared.Money;
import com.gonezo.domain.shared.YearMonth;
import java.util.List;
import java.util.UUID;

final class AndroidBudgetingStubs {
  private AndroidBudgetingStubs() {}

  static CategoryRepository categoryRepository() {
    return new CategoryRepository() {
      @Override
      public Category get(UUID id) {
        throw notMigrated("category lookup");
      }

      @Override
      public List<Category> listByPlan(UUID planId) {
        return List.of();
      }
    };
  }

  static BudgetPlanRepository budgetPlanRepository() {
    return new BudgetPlanRepository() {
      @Override
      public BudgetPlan get(UUID id) {
        throw notMigrated("budget plan lookup");
      }

      @Override
      public void save(BudgetPlan plan) {
        throw notMigrated("budget plan save");
      }
    };
  }

  static BudgetPeriodRepository budgetPeriodRepository() {
    return new BudgetPeriodRepository() {
      @Override
      public BudgetPeriod get(UUID id) {
        throw notMigrated("budget period lookup");
      }

      @Override
      public BudgetPeriod getByYearMonth(UUID planId, YearMonth yearMonth) {
        throw notMigrated("budget period lookup by year-month");
      }

      @Override
      public void save(BudgetPeriod period) {
        throw notMigrated("budget period save");
      }

      @Override
      public void updateTotals(UUID id, Money incomeTotal, Money remainder) {
        throw notMigrated("budget period totals update");
      }
    };
  }

  static CategoryBalanceRepository categoryBalanceRepository() {
    return new CategoryBalanceRepository() {
      @Override
      public void save(CategoryBalance balance) {
        throw notMigrated("category balance save");
      }

      @Override
      public CategoryBalance findByPeriodAndCategory(UUID periodId, UUID categoryId) {
        return null;
      }

      @Override
      public List<CategoryBalance> listByPeriod(UUID periodId) {
        return List.of();
      }
    };
  }

  static BudgetLinkRepository budgetLinkRepository() {
    return new BudgetLinkRepository() {
      @Override
      public void save(BudgetLink link) {
        throw notMigrated("budget link save");
      }
    };
  }

  static BudgetReservationRepository budgetReservationRepository() {
    return new BudgetReservationRepository() {
      @Override
      public BudgetReservation get(UUID id) {
        throw notMigrated("reservation lookup");
      }

      @Override
      public BudgetReservation findByPeriodAndPattern(UUID periodId, UUID patternId) {
        return null;
      }

      @Override
      public List<BudgetReservation> listActiveByPeriod(UUID periodId) {
        return List.of();
      }

      @Override
      public void save(BudgetReservation reservation) {
        throw notMigrated("reservation save");
      }
    };
  }

  static RecurringPatternRepository recurringPatternRepository() {
    return new RecurringPatternRepository() {
      @Override
      public List<RecurringPattern> listActiveByPlan(UUID planId) {
        return List.of();
      }

      @Override
      public void save(RecurringPattern pattern) {
        throw notMigrated("recurring pattern save");
      }
    };
  }

  static SettleReservationFromTxUC settleReservationFromTxUC() {
    return new SettleReservationFromTxUC() {
      @Override
      public void execute(SettleReservationFromTxCommand command) {
        throw notMigrated("reservation settlement");
      }
    };
  }

  private static IllegalStateException notMigrated(String capability) {
    return new IllegalStateException("Budgeting capability not migrated on-device yet: " + capability);
  }
}
