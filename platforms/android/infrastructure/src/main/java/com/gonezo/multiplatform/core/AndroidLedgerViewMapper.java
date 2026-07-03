package com.gonezo.multiplatform.core;

import com.gonezo.ledger.domain.Account;
import com.gonezo.ledger.domain.Transaction;
import java.util.List;

final class AndroidLedgerViewMapper {
  private AndroidLedgerViewMapper() {}

  static AndroidLedgerCore.LedgerAccountView toAccountView(Account account) {
    return new AndroidLedgerCore.LedgerAccountView(
      account.getId().toString(),
      account.getName(),
      account.getType().getValue(),
      account.getCurrency().toString(),
      account.getStatus().getValue()
    );
  }

  static AndroidLedgerCore.LedgerTransactionView toTransactionView(Transaction tx) {
    List<AndroidLedgerCore.LedgerTransactionItemView> items = tx.getItems().stream()
      .map((item) -> new AndroidLedgerCore.LedgerTransactionItemView(
        item.getId().toString(),
        item.getName(),
        item.getAmount().getAmount().toPlainString(),
        item.getAmount().getCurrency(),
        null,
        item.getNote()
      ))
      .toList();
    return new AndroidLedgerCore.LedgerTransactionView(
      tx.getId().toString(),
      tx.getAccountId().toString(),
      tx.getType().getValue(),
      tx.getStatus().getValue(),
      tx.getAmount().getAmount().toPlainString(),
      tx.getAmount().getCurrency(),
      tx.getOccurredAt().toString(),
      tx.getDescription(),
      tx.getMerchant(),
      null,
      tx.getLinkedTransactionId() == null ? null : tx.getLinkedTransactionId().toString(),
      items
    );
  }
}
