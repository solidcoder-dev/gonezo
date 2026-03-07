package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.investments.InvestmentTransaction;
import com.gonezo.domain.investments.InvestmentTransactionType;
import com.gonezo.domain.investments.ports.InvestmentTransactionRepository;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class AndroidInvestmentTransactionRepository implements InvestmentTransactionRepository {
  private final CoreDatabase db;

  AndroidInvestmentTransactionRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void save(InvestmentTransaction transaction) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", transaction.getId().toString());
    values.put("container_id", transaction.getContainerId().toString());
    values.put("date", transaction.getDate().toString());
    values.put("type", transaction.getType().getValue());
    values.put("asset_id", transaction.getAssetId() == null ? null : transaction.getAssetId().toString());
    values.put("quantity", transaction.getQuantity() == null ? null : transaction.getQuantity().toPlainString());
    values.put("amount", transaction.getAmount().getAmount().toPlainString());
    values.put("currency", transaction.getAmount().getCurrency());
    values.put("fees_amount", transaction.getFees() == null ? null : transaction.getFees().getAmount().toPlainString());
    values.put("fees_currency", transaction.getFees() == null ? null : transaction.getFees().getCurrency());
    values.put("taxes_amount", transaction.getTaxes() == null ? null : transaction.getTaxes().getAmount().toPlainString());
    values.put("taxes_currency", transaction.getTaxes() == null ? null : transaction.getTaxes().getCurrency());
    values.put("note", transaction.getNote());

    long result = database.insertWithOnConflict("investment_transactions", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save investment transaction: " + transaction.getId());
    }
  }

  @Override
  public List<InvestmentTransaction> listByContainer(UUID containerId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "investment_transactions",
      new String[] {"id", "container_id", "date", "type", "asset_id", "quantity", "amount", "currency", "fees_amount", "fees_currency", "taxes_amount", "taxes_currency", "note"},
      "container_id = ?",
      new String[] {containerId.toString()},
      null,
      null,
      "date desc"
    );
    try {
      List<InvestmentTransaction> transactions = new ArrayList<>();
      while (cursor.moveToNext()) {
        transactions.add(mapTransaction(cursor));
      }
      return transactions;
    } finally {
      cursor.close();
    }
  }

  private static InvestmentTransaction mapTransaction(Cursor cursor) {
    String assetId = cursor.getString(4);
    String quantity = cursor.getString(5);
    String feesAmount = cursor.getString(8);
    String feesCurrency = cursor.getString(9);
    String taxesAmount = cursor.getString(10);
    String taxesCurrency = cursor.getString(11);

    return new InvestmentTransaction(
      UUID.fromString(cursor.getString(0)),
      UUID.fromString(cursor.getString(1)),
      LocalDate.parse(cursor.getString(2)),
      InvestmentTransactionType.Companion.from(cursor.getString(3)),
      assetId == null ? null : UUID.fromString(assetId),
      quantity == null ? null : new BigDecimal(quantity),
      new Money(new BigDecimal(cursor.getString(6)), cursor.getString(7)),
      (feesAmount == null || feesCurrency == null) ? null : new Money(new BigDecimal(feesAmount), feesCurrency),
      (taxesAmount == null || taxesCurrency == null) ? null : new Money(new BigDecimal(taxesAmount), taxesCurrency),
      cursor.getString(12)
    );
  }
}
