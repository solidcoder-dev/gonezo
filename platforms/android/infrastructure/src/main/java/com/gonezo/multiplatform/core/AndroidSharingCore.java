package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public final class AndroidSharingCore {
  private static AndroidSharingCore instance;

  private final CoreDatabase database;
  private final Clock clock;

  private AndroidSharingCore(Context context) {
    this.database = new CoreDatabase(context.getApplicationContext());
    this.clock = Clock.systemUTC();
  }

  public static synchronized AndroidSharingCore getInstance(Context context) {
    if (instance == null) {
      instance = new AndroidSharingCore(context);
    }
    return instance;
  }

  public List<PersonView> listPeople() {
    Cursor cursor = database.getReadableDatabase().query(
      "sharing_persons",
      new String[] { "id", "display_name" },
      "archived_at is null",
      new String[] {},
      null,
      null,
      "display_name collate nocase asc"
    );
    try (cursor) {
      List<PersonView> people = new ArrayList<>();
      while (cursor.moveToNext()) {
        people.add(new PersonView(cursor.getString(0), cursor.getString(1)));
      }
      return people;
    }
  }

  public ShareView applyShareToPostedTransaction(
    String transactionId,
    String payerName,
    List<ParticipantInput> participants,
    String appliedAt
  ) {
    String resolvedTransactionId = requireText(transactionId, "transactionId is required");
    PostedExpense expense = findPostedExpense(resolvedTransactionId);
    Instant now = blankToNull(appliedAt) == null ? Instant.now(clock) : Instant.parse(appliedAt);

    SQLiteDatabase db = database.getWritableDatabase();
    db.beginTransaction();
    try {
      deleteExistingShare(resolvedTransactionId);

      String payerPersonId = findOrCreatePerson(requireText(payerName, "payerName is required"), now);
      String shareId = UUID.randomUUID().toString();
      ContentValues shareValues = new ContentValues();
      shareValues.put("id", shareId);
      shareValues.put("source_transaction_id", resolvedTransactionId);
      shareValues.put("payer_person_id", payerPersonId);
      shareValues.put("total_amount", expense.amount());
      shareValues.put("currency", expense.currency());
      shareValues.put("created_at", now.toString());
      shareValues.put("updated_at", now.toString());
      insertOrThrow("sharing_expense_shares", shareValues, "Failed to create expense share");

      addAnalyticsExclusion("movement", resolvedTransactionId, "shared_expense_lent_amount", now);
      for (ParticipantInput participant : participants) {
        addParticipant(shareId, expense, participant, now);
      }

      db.setTransactionSuccessful();
      return getMovementDetails(resolvedTransactionId).share();
    } finally {
      db.endTransaction();
    }
  }

  public MovementDetailsView getMovementDetails(String transactionId) {
    String resolvedTransactionId = requireText(transactionId, "transactionId is required");
    Cursor shareCursor = database.getReadableDatabase().query(
      "sharing_expense_shares",
      new String[] { "id", "source_transaction_id", "total_amount", "currency" },
      "source_transaction_id = ?",
      new String[] { resolvedTransactionId },
      null,
      null,
      null
    );

    try (shareCursor) {
      if (!shareCursor.moveToFirst()) {
        return null;
      }
      String shareId = shareCursor.getString(0);
      List<ParticipantView> participants = loadParticipants(shareId);
      BigDecimal reimbursable = BigDecimal.ZERO;
      for (ParticipantView participant : participants) {
        if (participant.reimbursable()) {
          reimbursable = reimbursable.add(new BigDecimal(participant.amount()));
        }
      }
      ShareView share = new ShareView(
        shareId,
        shareCursor.getString(1),
        participants,
        new AnalyticsView(
          new BigDecimal(shareCursor.getString(2)).subtract(reimbursable).toPlainString(),
          reimbursable.toPlainString(),
          reimbursable.toPlainString()
        )
      );
      return new MovementDetailsView(share);
    }
  }

  private void addParticipant(String shareId, PostedExpense expense, ParticipantInput participant, Instant now) {
    String displayName = requireText(participant.personName(), "participant personName is required");
    String personId = findOrCreatePerson(displayName, now);
    BigDecimal amount = parsePositiveDecimal(participant.amount(), "participant amount is required");
    String expectedMovementId = null;
    if (participant.reimbursable()) {
      expectedMovementId = createExpectedMovement(
        expense.accountId(),
        "income",
        amount.toPlainString(),
        expense.currency(),
        now.toString(),
        "Reimbursement from " + displayName,
        displayName,
        null,
        null,
        null
      );
      addAnalyticsExclusion("movement", expectedMovementId, "shared_expense_reimbursement", now);
    }

    ContentValues values = new ContentValues();
    values.put("id", UUID.randomUUID().toString());
    values.put("share_id", shareId);
    values.put("person_id", personId);
    values.put("amount", amount.toPlainString());
    values.put("reimbursable", participant.reimbursable() ? 1 : 0);
    putNullable(values, "expected_movement_id", expectedMovementId);
    insertOrThrow("sharing_expense_share_participants", values, "Failed to create share participant");
  }

  private PostedExpense findPostedExpense(String transactionId) {
    Cursor cursor = database.getReadableDatabase().query(
      "ledger_transactions",
      new String[] { "id", "account_id", "type", "amount", "currency" },
      "id = ? and status = ?",
      new String[] { transactionId, "posted" },
      null,
      null,
      null
    );
    try (cursor) {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Posted transaction not found: " + transactionId);
      }
      if (!"expense".equalsIgnoreCase(cursor.getString(2))) {
        throw new IllegalArgumentException("Only posted expenses can be shared");
      }
      return new PostedExpense(cursor.getString(0), cursor.getString(1), cursor.getString(3), cursor.getString(4));
    }
  }

  private List<ParticipantView> loadParticipants(String shareId) {
    Cursor cursor = database.getReadableDatabase().rawQuery(
      "select sp.id, sp.person_id, pe.display_name, sp.amount, sp.reimbursable, sp.expected_movement_id, em.status " +
        "from sharing_expense_share_participants sp " +
        "join sharing_persons pe on pe.id = sp.person_id " +
        "left join expected_movements em on em.id = sp.expected_movement_id " +
        "where sp.share_id = ? order by pe.display_name collate nocase asc",
      new String[] { shareId }
    );
    try (cursor) {
      List<ParticipantView> participants = new ArrayList<>();
      while (cursor.moveToNext()) {
        String expectedMovementId = cursor.getString(5);
        participants.add(new ParticipantView(
          cursor.getString(0),
          cursor.getString(1),
          cursor.getString(2),
          cursor.getString(3),
          cursor.getInt(4) == 1,
          expectedMovementId,
          repaymentStatus(expectedMovementId, cursor.getString(6))
        ));
      }
      return participants;
    }
  }

  private String repaymentStatus(String expectedMovementId, String expectedStatus) {
    if (expectedMovementId == null) {
      return "not_expected";
    }
    if (expectedStatus == null) {
      return "missing_expected";
    }
    if ("resolved".equalsIgnoreCase(expectedStatus)) {
      return "paid";
    }
    if ("dismissed".equalsIgnoreCase(expectedStatus)) {
      return "dismissed";
    }
    return "pending";
  }

  private void deleteExistingShare(String transactionId) {
    List<String> expectedMovementIds = new ArrayList<>();
    Cursor cursor = database.getReadableDatabase().rawQuery(
      "select sp.expected_movement_id from sharing_expense_share_participants sp " +
        "join sharing_expense_shares s on s.id = sp.share_id " +
        "where s.source_transaction_id = ? and sp.expected_movement_id is not null",
      new String[] { transactionId }
    );
    try (cursor) {
      while (cursor.moveToNext()) {
        expectedMovementIds.add(cursor.getString(0));
      }
    }

    database.getWritableDatabase().delete(
      "sharing_expense_shares",
      "source_transaction_id = ?",
      new String[] { transactionId }
    );
    database.getWritableDatabase().delete(
      "analytics_exclusions",
      "scope_type = ? and scope_id = ?",
      new String[] { "movement", transactionId }
    );
    for (String expectedMovementId : expectedMovementIds) {
      database.getWritableDatabase().delete("expected_movements", "id = ?", new String[] { expectedMovementId });
      database.getWritableDatabase().delete(
        "analytics_exclusions",
        "scope_type = ? and scope_id = ?",
        new String[] { "movement", expectedMovementId }
      );
    }
  }

  private String findOrCreatePerson(String displayName, Instant now) {
    String normalizedName = normalizeName(displayName);
    Cursor cursor = database.getReadableDatabase().query(
      "sharing_persons",
      new String[] { "id" },
      "normalized_name = ? and archived_at is null",
      new String[] { normalizedName },
      null,
      null,
      null
    );
    try (cursor) {
      if (cursor.moveToFirst()) {
        return cursor.getString(0);
      }
    }

    String id = UUID.randomUUID().toString();
    ContentValues values = new ContentValues();
    values.put("id", id);
    values.put("display_name", displayName.trim());
    values.put("normalized_name", normalizedName);
    values.put("created_at", now.toString());
    values.putNull("archived_at");
    insertOrThrow("sharing_persons", values, "Failed to create sharing person");
    return id;
  }

  private void addAnalyticsExclusion(String scopeType, String scopeId, String reason, Instant now) {
    ContentValues values = new ContentValues();
    values.put("id", UUID.randomUUID().toString());
    values.put("scope_type", scopeType);
    values.put("scope_id", scopeId);
    values.put("reason", reason);
    values.put("created_at", now.toString());
    database.getWritableDatabase().insertWithOnConflict(
      "analytics_exclusions",
      null,
      values,
      SQLiteDatabase.CONFLICT_IGNORE
    );
  }

  private String createExpectedMovement(
    String accountId,
    String type,
    String amount,
    String currency,
    String expectedAt,
    String description,
    String merchant,
    String categoryId,
    String originOccurrenceId,
    String originRecurringMovementId
  ) {
    String id = UUID.randomUUID().toString();
    String now = Instant.now(clock).toString();
    ContentValues values = new ContentValues();
    values.put("id", id);
    values.put("account_id", accountId);
    values.put("movement_type", type);
    values.put("amount", amount);
    values.put("currency", currency);
    values.put("expected_at", expectedAt);
    putNullable(values, "description", description);
    putNullable(values, "merchant", merchant);
    putNullable(values, "category_id", categoryId);
    putNullable(values, "origin_occurrence_id", originOccurrenceId);
    putNullable(values, "origin_recurring_movement_id", originRecurringMovementId);
    values.put("status", "pending");
    values.putNull("resolved_transaction_id");
    values.put("created_at", now);
    values.put("updated_at", now);
    values.putNull("resolved_at");
    values.putNull("dismissed_at");
    insertOrThrow("expected_movements", values, "Failed to create reimbursement expected movement");
    return id;
  }

  private void insertOrThrow(String table, ContentValues values, String message) {
    long inserted = database.getWritableDatabase().insertWithOnConflict(table, null, values, SQLiteDatabase.CONFLICT_ABORT);
    if (inserted == -1L) {
      throw new IllegalStateException(message);
    }
  }

  private static void putNullable(ContentValues values, String key, String value) {
    if (value == null) {
      values.putNull(key);
    } else {
      values.put(key, value);
    }
  }

  private static String requireText(String value, String message) {
    if (value == null || value.trim().isEmpty()) {
      throw new IllegalArgumentException(message);
    }
    return value.trim();
  }

  private static String blankToNull(String value) {
    return value == null || value.trim().isEmpty() ? null : value.trim();
  }

  private static BigDecimal parsePositiveDecimal(String value, String message) {
    BigDecimal amount = new BigDecimal(requireText(value, message));
    if (amount.signum() <= 0) {
      throw new IllegalArgumentException("amount must be positive");
    }
    return amount;
  }

  private static String normalizeName(String value) {
    return requireText(value, "person name is required")
      .replaceAll("\\s+", " ")
      .toLowerCase(Locale.ROOT);
  }

  private record PostedExpense(String id, String accountId, String amount, String currency) {}

  public record ParticipantInput(String personName, String amount, boolean reimbursable) {}

  public record PersonView(String id, String displayName) {}

  public record ParticipantView(
    String participantId,
    String personId,
    String displayName,
    String amount,
    boolean reimbursable,
    String expectedMovementId,
    String repaymentStatus
  ) {}

  public record AnalyticsView(
    String personalExpenseAmount,
    String excludedLentAmount,
    String excludedReimbursementIncomeAmount
  ) {}

  public record ShareView(
    String shareId,
    String transactionId,
    List<ParticipantView> participants,
    AnalyticsView analytics
  ) {}

  public record MovementDetailsView(ShareView share) {}
}
