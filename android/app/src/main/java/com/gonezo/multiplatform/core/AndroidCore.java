package com.gonezo.multiplatform.core;

import android.content.Context;
import com.gonezo.application.CreateAccountCommand;
import com.gonezo.application.CreateAccountUC;
import com.gonezo.application.services.CreateAccountService;
import com.gonezo.domain.cashledger.AccountType;
import java.util.UUID;

public final class AndroidCore {
  private static AndroidCore instance;

  private final CreateAccountUC createAccountUC;

  private AndroidCore(Context context) {
    CoreDatabase database = new CoreDatabase(context.getApplicationContext());
    AndroidAccountRepository accountRepository = new AndroidAccountRepository(database);
    NoopDomainEventPublisher eventPublisher = new NoopDomainEventPublisher();
    this.createAccountUC = new CreateAccountService(accountRepository, eventPublisher);
  }

  public static synchronized AndroidCore getInstance(Context context) {
    if (instance == null) {
      instance = new AndroidCore(context);
    }
    return instance;
  }

  public UUID createAccount(String name, String userId, String type, String currency) {
    String trimmedName = name == null ? "" : name.trim();
    if (trimmedName.isEmpty()) {
      throw new IllegalArgumentException("name is required");
    }
    UUID resolvedUserId = userId == null || userId.isBlank() ? UUID.randomUUID() : UUID.fromString(userId);
    String resolvedType = type == null || type.isBlank() ? "cash" : type;
    String resolvedCurrency = currency == null || currency.isBlank() ? "USD" : currency;

    AccountType accountType = AccountType.Companion.from(resolvedType);
    CreateAccountCommand command = new CreateAccountCommand(resolvedUserId, trimmedName, accountType, resolvedCurrency);
    return createAccountUC.execute(command);
  }
}
