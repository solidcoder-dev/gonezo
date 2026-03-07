package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.cashledger.Transaction;
import com.gonezo.domain.cashledger.TransactionType;
import com.gonezo.domain.cashledger.ports.TransactionRepository;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidTransactionRepository implements TransactionRepository {
  private final CoreDatabase db;

  AndroidTransactionRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void save(Transaction transaction) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", transaction.getId().toString());
    values.put("account_id", transaction.getAccountId().toString());
    values.put("posted_date", transaction.getPostedDate().toString());
    values.put("effective_date", transaction.getEffectiveDate().toString());
    values.put("amount", transaction.getAmount().getAmount().toPlainString());
    values.put("currency", transaction.getAmount().getCurrency());
    values.put("type", transaction.getType().getValue());
    values.put("merchant", transaction.getMerchant());
    values.put("category_id", transaction.getCategoryId() == null ? null : transaction.getCategoryId().toString());
    values.put("recurring", transaction.getRecurring() ? 1 : 0);

    long result = database.insertWithOnConflict("transactions", null, values, SQLiteDatabase.CONFLICT_ABORT);
    if (result == -1) {
      throw new IllegalStateException("Failed to insert transaction: " + transaction.getId());
    }
  }

  @Override
  public List<Transaction> listByAccount(UUID accountId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "transactions",
      new String[] {"id", "account_id", "posted_date", "effective_date", "amount", "currency", "type", "merchant", "category_id", "recurring"},
      "account_id = ?",
      new String[] {accountId.toString()},
      null,
      null,
      "posted_date desc, id desc"
    );

    try {
      List<Transaction> transactions = new ArrayList<>();
      while (cursor.moveToNext()) {
        UUID id = UUID.fromString(cursor.getString(0));
        UUID resolvedAccountId = UUID.fromString(cursor.getString(1));
        LocalDate postedDate = LocalDate.parse(cursor.getString(2));
        LocalDate effectiveDate = LocalDate.parse(cursor.getString(3));
        BigDecimal amount = new BigDecimal(cursor.getString(4));
        String currency = cursor.getString(5);
        TransactionType type = TransactionType.Companion.from(cursor.getString(6));
        String merchant = cursor.getString(7);
        String categoryIdValue = cursor.getString(8);
        UUID categoryId = categoryIdValue == null ? null : UUID.fromString(categoryIdValue);
        boolean recurring = cursor.getInt(9) == 1;

        transactions.add(
          new Transaction(
            id,
            resolvedAccountId,
            postedDate,
            effectiveDate,
            new Money(amount, currency),
            type,
            merchant,
            categoryId,
            recurring
          )
        );
      }
      return transactions;
    } finally {
      cursor.close();
    }
  }
}
