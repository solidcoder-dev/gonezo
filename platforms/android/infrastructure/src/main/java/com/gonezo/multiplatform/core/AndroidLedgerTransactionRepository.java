package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.ledger.AccountId;
import com.gonezo.domain.ledger.CategoryId;
import com.gonezo.domain.ledger.DateRange;
import com.gonezo.domain.ledger.Transaction;
import com.gonezo.domain.ledger.TransactionId;
import com.gonezo.domain.ledger.TransactionItem;
import com.gonezo.domain.ledger.TransactionItemId;
import com.gonezo.domain.ledger.TransactionStatus;
import com.gonezo.domain.ledger.TransactionType;
import com.gonezo.domain.ledger.ports.LedgerTransactionRepository;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidLedgerTransactionRepository implements LedgerTransactionRepository {
  private final CoreDatabase db;

  AndroidLedgerTransactionRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void save(Transaction transaction) {
    SQLiteDatabase database = db.getWritableDatabase();

    ContentValues tx = new ContentValues();
    tx.put("id", transaction.getId().toString());
    tx.put("account_id", transaction.getAccountId().toString());
    tx.put("type", transaction.getType().getValue());
    tx.put("amount", transaction.getAmount().getAmount().toPlainString());
    tx.put("currency", transaction.getAmount().getCurrency());
    tx.put("occurred_at", transaction.getOccurredAt().toString());
    tx.put("description", transaction.getDescription());
    tx.put("merchant", transaction.getMerchant());
    if (transaction.getCategoryId() == null) {
      tx.putNull("category_id");
    } else {
      tx.put("category_id", transaction.getCategoryId().toString());
    }
    tx.put("status", transaction.getStatus().getValue());
    if (transaction.getLinkedTransactionId() == null) {
      tx.putNull("linked_transaction_id");
    } else {
      tx.put("linked_transaction_id", transaction.getLinkedTransactionId().toString());
    }

    long result = database.insertWithOnConflict("ledger_transactions", null, tx, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to upsert ledger transaction: " + transaction.getId());
    }

    database.delete("ledger_transaction_items", "transaction_id = ?", new String[] {transaction.getId().toString()});
    for (TransactionItem item : transaction.getItems()) {
      ContentValues row = new ContentValues();
      row.put("id", item.getId().toString());
      row.put("transaction_id", transaction.getId().toString());
      row.put("name", item.getName());
      row.put("amount", item.getAmount().getAmount().toPlainString());
      row.put("currency", item.getAmount().getCurrency());
      if (item.getCategoryId() == null) {
        row.putNull("category_id");
      } else {
        row.put("category_id", item.getCategoryId().toString());
      }
      row.put("note", item.getNote());
      long itemResult = database.insertWithOnConflict("ledger_transaction_items", null, row, SQLiteDatabase.CONFLICT_REPLACE);
      if (itemResult == -1) {
        throw new IllegalStateException("Failed to upsert ledger transaction item: " + item.getId());
      }
    }
  }

  @Override
  public Transaction findById(TransactionId id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "ledger_transactions",
      new String[] {"id", "account_id", "type", "amount", "currency", "occurred_at", "description", "merchant", "category_id", "status", "linked_transaction_id"},
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        return null;
      }
      return mapTransaction(cursor, database);
    } finally {
      cursor.close();
    }
  }

  @Override
  public List<Transaction> findByAccount(AccountId accountId, Integer limit) {
    String orderBy = "occurred_at desc, id desc";
    String limitClause = limit != null && limit > 0 ? String.valueOf(limit) : null;
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "ledger_transactions",
      new String[] {"id", "account_id", "type", "amount", "currency", "occurred_at", "description", "merchant", "category_id", "status", "linked_transaction_id"},
      "account_id = ?",
      new String[] {accountId.toString()},
      null,
      null,
      orderBy,
      limitClause
    );
    return mapTransactions(cursor, database);
  }

  @Override
  public List<Transaction> findByAccountAndPeriod(AccountId accountId, DateRange range) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "ledger_transactions",
      new String[] {"id", "account_id", "type", "amount", "currency", "occurred_at", "description", "merchant", "category_id", "status", "linked_transaction_id"},
      "account_id = ? and occurred_at >= ? and occurred_at <= ?",
      new String[] {accountId.toString(), range.getFrom().toString(), range.getTo().toString()},
      null,
      null,
      "occurred_at desc, id desc"
    );
    return mapTransactions(cursor, database);
  }

  @Override
  public List<Transaction> findByAccountAndCategory(AccountId accountId, CategoryId categoryId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "ledger_transactions",
      new String[] {"id", "account_id", "type", "amount", "currency", "occurred_at", "description", "merchant", "category_id", "status", "linked_transaction_id"},
      "account_id = ? and category_id = ?",
      new String[] {accountId.toString(), categoryId.toString()},
      null,
      null,
      "occurred_at desc, id desc"
    );
    return mapTransactions(cursor, database);
  }

  @Override
  public List<Transaction> findByAccountAndMerchant(AccountId accountId, String merchant) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "ledger_transactions",
      new String[] {"id", "account_id", "type", "amount", "currency", "occurred_at", "description", "merchant", "category_id", "status", "linked_transaction_id"},
      "account_id = ? and lower(merchant) = lower(?)",
      new String[] {accountId.toString(), merchant.trim()},
      null,
      null,
      "occurred_at desc, id desc"
    );
    return mapTransactions(cursor, database);
  }

  private static List<Transaction> mapTransactions(Cursor cursor, SQLiteDatabase database) {
    try {
      List<Transaction> transactions = new ArrayList<>();
      while (cursor.moveToNext()) {
        transactions.add(mapTransaction(cursor, database));
      }
      return transactions;
    } finally {
      cursor.close();
    }
  }

  private static Transaction mapTransaction(Cursor cursor, SQLiteDatabase database) {
    TransactionId id = new TransactionId(UUID.fromString(cursor.getString(0)));
    AccountId accountId = new AccountId(UUID.fromString(cursor.getString(1)));
    TransactionType type = TransactionType.Companion.from(cursor.getString(2));
    Money amount = new Money(new BigDecimal(cursor.getString(3)), cursor.getString(4));
    Instant occurredAt = Instant.parse(cursor.getString(5));
    String description = cursor.getString(6);
    String merchant = cursor.getString(7);
    String categoryIdRaw = cursor.getString(8);
    CategoryId categoryId = categoryIdRaw == null ? null : new CategoryId(UUID.fromString(categoryIdRaw));
    TransactionStatus status = TransactionStatus.Companion.from(cursor.getString(9));
    String linkedRaw = cursor.getString(10);
    TransactionId linkedId = linkedRaw == null ? null : new TransactionId(UUID.fromString(linkedRaw));
    List<TransactionItem> items = loadItems(database, id);
    return new Transaction(
      id,
      accountId,
      type,
      amount,
      occurredAt,
      description,
      merchant,
      categoryId,
      status,
      items,
      linkedId
    );
  }

  private static List<TransactionItem> loadItems(SQLiteDatabase database, TransactionId transactionId) {
    Cursor cursor = database.query(
      "ledger_transaction_items",
      new String[] {"id", "name", "amount", "currency", "category_id", "note"},
      "transaction_id = ?",
      new String[] {transactionId.toString()},
      null,
      null,
      "id asc"
    );
    try {
      List<TransactionItem> items = new ArrayList<>();
      while (cursor.moveToNext()) {
        TransactionItemId id = new TransactionItemId(UUID.fromString(cursor.getString(0)));
        String name = cursor.getString(1);
        Money amount = new Money(new BigDecimal(cursor.getString(2)), cursor.getString(3));
        String categoryIdRaw = cursor.getString(4);
        CategoryId categoryId = categoryIdRaw == null ? null : new CategoryId(UUID.fromString(categoryIdRaw));
        String note = cursor.getString(5);
        items.add(new TransactionItem(id, name, amount, categoryId, note));
      }
      return items;
    } finally {
      cursor.close();
    }
  }
}
