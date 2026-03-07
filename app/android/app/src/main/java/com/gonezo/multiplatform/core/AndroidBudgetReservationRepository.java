package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.budgeting.BudgetReservation;
import com.gonezo.domain.budgeting.ReservationStatus;
import com.gonezo.domain.budgeting.ports.BudgetReservationRepository;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidBudgetReservationRepository implements BudgetReservationRepository {
  private final CoreDatabase db;

  AndroidBudgetReservationRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public BudgetReservation get(UUID id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "budget_reservations",
      projection(),
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Budget reservation not found: " + id);
      }
      return mapReservation(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public BudgetReservation findByPeriodAndPattern(UUID periodId, UUID patternId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "budget_reservations",
      projection(),
      "budget_period_id = ? and pattern_id = ?",
      new String[] {periodId.toString(), patternId.toString()},
      null,
      null,
      null,
      "1"
    );
    try {
      if (!cursor.moveToFirst()) {
        return null;
      }
      return mapReservation(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public List<BudgetReservation> listActiveByPeriod(UUID periodId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "budget_reservations",
      projection(),
      "budget_period_id = ? and status = ?",
      new String[] {periodId.toString(), ReservationStatus.ACTIVE.getValue()},
      null,
      null,
      "expected_effective_date asc"
    );
    try {
      List<BudgetReservation> reservations = new ArrayList<>();
      while (cursor.moveToNext()) {
        reservations.add(mapReservation(cursor));
      }
      return reservations;
    } finally {
      cursor.close();
    }
  }

  @Override
  public void save(BudgetReservation reservation) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", reservation.getId().toString());
    values.put("budget_period_id", reservation.getBudgetPeriodId().toString());
    values.put("pattern_id", reservation.getPatternId().toString());
    values.put("category_id", reservation.getCategoryId().toString());
    values.put("amount", reservation.getAmount().getAmount().toPlainString());
    values.put("currency", reservation.getAmount().getCurrency());
    values.put("status", reservation.getStatus().getValue());
    values.put("expected_effective_date", reservation.getExpectedEffectiveDate().toString());
    values.put("linked_transaction_id", reservation.getLinkedTransactionId() == null ? null : reservation.getLinkedTransactionId().toString());

    long result = database.insertWithOnConflict("budget_reservations", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save budget reservation: " + reservation.getId());
    }
  }

  private static String[] projection() {
    return new String[] {
      "id", "budget_period_id", "pattern_id", "category_id",
      "amount", "currency", "status", "expected_effective_date", "linked_transaction_id"
    };
  }

  private static BudgetReservation mapReservation(Cursor cursor) {
    String linkedTx = cursor.getString(8);
    return new BudgetReservation(
      UUID.fromString(cursor.getString(0)),
      UUID.fromString(cursor.getString(1)),
      UUID.fromString(cursor.getString(2)),
      UUID.fromString(cursor.getString(3)),
      new Money(new BigDecimal(cursor.getString(4)), cursor.getString(5)),
      ReservationStatus.Companion.from(cursor.getString(6)),
      LocalDate.parse(cursor.getString(7)),
      linkedTx == null ? null : UUID.fromString(linkedTx)
    );
  }
}
