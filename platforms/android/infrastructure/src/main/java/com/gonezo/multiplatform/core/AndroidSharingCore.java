package com.gonezo.multiplatform.core;

import android.content.Context;
import android.database.Cursor;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public final class AndroidSharingCore {
  private static AndroidSharingCore instance;

  private final CoreDatabase database;

  private AndroidSharingCore(Context context) {
    this.database = new CoreDatabase(context.getApplicationContext());
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

  public List<MovementDetailsView> listMovementDetails(List<String> transactionIds) {
    List<MovementDetailsView> items = new ArrayList<>();
    for (String transactionId : transactionIds) {
      MovementDetailsView details = getMovementDetails(transactionId);
      if (details != null) {
        items.add(details);
      }
    }
    return items;
  }

  public PlannedShareView getPlannedShare(String expectedMovementId) {
    String resolvedExpectedMovementId = requireText(expectedMovementId, "expectedMovementId is required");
    Cursor shareCursor = database.getReadableDatabase().rawQuery(
      "select s.expected_movement_ref, s.payer_person_id, p.display_name, s.mode, s.total_amount, s.currency, s.payer_parts " +
        "from sharing_planned_expense_shares s join sharing_persons p on p.id = s.payer_person_id " +
        "where s.expected_movement_ref = ? and s.status in ('pending', 'materialized') limit 1",
      new String[] { resolvedExpectedMovementId }
    );
    try (shareCursor) {
      if (!shareCursor.moveToFirst()) {
        return null;
      }
      String shareId = shareCursor.getString(0);
      List<PlannedParticipantView> participants = new ArrayList<>();
      Cursor participantCursor = database.getReadableDatabase().rawQuery(
        "select sp.id, sp.person_id, p.display_name, sp.participant_parts, sp.amount, sp.reimbursable " +
          "from sharing_planned_expense_share_participants sp join sharing_persons p on p.id = sp.person_id " +
          "join sharing_planned_expense_shares s on s.id = sp.planned_share_id " +
          "where s.expected_movement_ref = ? order by sp.participant_order asc",
        new String[] { resolvedExpectedMovementId }
      );
      try (participantCursor) {
        while (participantCursor.moveToNext()) {
          participants.add(new PlannedParticipantView(
            participantCursor.getString(0), participantCursor.getString(1), participantCursor.getString(2),
            participantCursor.isNull(3) ? null : participantCursor.getInt(3), participantCursor.getString(4),
            participantCursor.getInt(5) == 1
          ));
        }
      }
      return new PlannedShareView(
        shareId, shareCursor.getString(1), shareCursor.getString(2), shareCursor.getString(3),
        shareCursor.getString(4), shareCursor.getString(5), shareCursor.isNull(6) ? null : shareCursor.getInt(6), participants
      );
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

  private static String requireText(String value, String message) {
    if (value == null || value.trim().isEmpty()) {
      throw new IllegalArgumentException(message);
    }
    return value.trim();
  }

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

  public record PlannedParticipantView(
    String participantId, String personId, String displayName, Integer parts, String amount, boolean reimbursable
  ) {}

  public record PlannedShareView(
    String expectedMovementId, String payerPersonId, String payerName, String mode, String totalAmount,
    String currency, Integer payerParts, List<PlannedParticipantView> participants
  ) {}
}
