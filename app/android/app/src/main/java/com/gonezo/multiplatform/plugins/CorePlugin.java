package com.gonezo.multiplatform.plugins;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CorePlugin")
public class CorePlugin extends Plugin {
  @PluginMethod
  public void preferencesGet(PluginCall call) {
    new PreferencesPluginHandler(getContext()).preferencesGet(call);
  }

  @PluginMethod
  public void preferencesSetDefaultAccount(PluginCall call) {
    new PreferencesPluginHandler(getContext()).preferencesSetDefaultAccount(call);
  }

  @PluginMethod
  public void preferencesClearDefaultAccount(PluginCall call) {
    new PreferencesPluginHandler(getContext()).preferencesClearDefaultAccount(call);
  }

  @PluginMethod
  public void ledgerOpenAccount(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerOpenAccount(call);
  }

  @PluginMethod
  public void ledgerListSupportedCurrencies(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerListSupportedCurrencies(call);
  }

  @PluginMethod
  public void ledgerRenameAccount(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerRenameAccount(call);
  }

  @PluginMethod
  public void ledgerArchiveAccount(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerArchiveAccount(call);
  }

  @PluginMethod
  public void ledgerRestoreAccount(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerRestoreAccount(call);
  }

  @PluginMethod
  public void ledgerDeleteAccount(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerDeleteAccount(call);
  }

  @PluginMethod
  public void ledgerListAccounts(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerListAccounts(call);
  }

  @PluginMethod
  public void ledgerGetAccountSummary(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerGetAccountSummary(call);
  }

  @PluginMethod
  public void ledgerRecordExpense(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerRecordExpense(call);
  }

  @PluginMethod
  public void ledgerRecordIncome(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerRecordIncome(call);
  }

  @PluginMethod
  public void ledgerRecordTransfer(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerRecordTransfer(call);
  }

  @PluginMethod
  public void ledgerRecordTransferFx(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerRecordTransferFx(call);
  }

  @PluginMethod
  public void ledgerCreateExpenseDraft(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerCreateExpenseDraft(call);
  }

  @PluginMethod
  public void ledgerAddTransactionItem(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerAddTransactionItem(call);
  }

  @PluginMethod
  public void ledgerPostDraftTransaction(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerPostDraftTransaction(call);
  }

  @PluginMethod
  public void ledgerVoidTransaction(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerVoidTransaction(call);
  }

  @PluginMethod
  public void ledgerListTransactions(PluginCall call) {
    new LedgerPluginHandler(getContext()).ledgerListTransactions(call);
  }

  @PluginMethod
  public void taxonomyListCategories(PluginCall call) {
    new TaxonomyPluginHandler(getContext()).taxonomyListCategories(call);
  }

  @PluginMethod
  public void taxonomyCreateCategory(PluginCall call) {
    new TaxonomyPluginHandler(getContext()).taxonomyCreateCategory(call);
  }

  @PluginMethod
  public void taxonomyRenameCategory(PluginCall call) {
    new TaxonomyPluginHandler(getContext()).taxonomyRenameCategory(call);
  }

  @PluginMethod
  public void taxonomyListTags(PluginCall call) {
    new TaxonomyPluginHandler(getContext()).taxonomyListTags(call);
  }

  @PluginMethod
  public void taxonomyRenameTag(PluginCall call) {
    new TaxonomyPluginHandler(getContext()).taxonomyRenameTag(call);
  }

  @PluginMethod
  public void mobillsImport(PluginCall call) {
    String fileBase64 = call.getString("fileBase64");
    if (fileBase64 == null || fileBase64.trim().isEmpty()) {
      call.reject("fileBase64 is required");
      return;
    }

    try {
      call.resolve(new MobillsImportHandler(getContext()).importBase64(fileBase64, call.getObject("policy")));
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void orchestrationCategorizeTransaction(PluginCall call) {
    new TaxonomyPluginHandler(getContext()).orchestrationCategorizeTransaction(call);
  }

  @PluginMethod
  public void orchestrationApplyTransactionTags(PluginCall call) {
    new TaxonomyPluginHandler(getContext()).orchestrationApplyTransactionTags(call);
  }

  @PluginMethod
  public void orchestrationListTransactionTaxonomy(PluginCall call) {
    new TaxonomyPluginHandler(getContext()).orchestrationListTransactionTaxonomy(call);
  }

  @PluginMethod
  public void movementsExportBackup(PluginCall call) {
    try {
      call.resolve(new MovementsBackupHandler(getContext()).exportBackup());
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void movementsImportBackup(PluginCall call) {
    String fileBase64 = call.getString("fileBase64");
    if (fileBase64 == null || fileBase64.trim().isEmpty()) {
      call.reject("fileBase64 is required");
      return;
    }

    try {
      call.resolve(new MovementsBackupHandler(getContext()).importBase64(fileBase64));
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void recurrenceCreateRecurringMovement(PluginCall call) {
    new RecurringPluginHandler(getContext()).recurrenceCreateRecurringMovement(call);
  }

  @PluginMethod
  public void recurrenceUpdateRecurringMovement(PluginCall call) {
    new RecurringPluginHandler(getContext()).recurrenceUpdateRecurringMovement(call);
  }

  @PluginMethod
  public void recurrenceDeactivateRecurringMovement(PluginCall call) {
    new RecurringPluginHandler(getContext()).recurrenceDeactivateRecurringMovement(call);
  }

  @PluginMethod
  public void recurrenceListRecurringMovements(PluginCall call) {
    new RecurringPluginHandler(getContext()).recurrenceListRecurringMovements(call);
  }

  @PluginMethod
  public void schedulingProcessDueMovements(PluginCall call) {
    new RecurringPluginHandler(getContext()).schedulingProcessDueMovements(call);
  }

  @PluginMethod
  public void expectedCreateMovement(PluginCall call) {
    new ExpectedPluginHandler(getContext()).expectedCreateMovement(call);
  }

  @PluginMethod
  public void expectedUpdateMovement(PluginCall call) {
    new ExpectedPluginHandler(getContext()).expectedUpdateMovement(call);
  }

  @PluginMethod
  public void expectedListMovements(PluginCall call) {
    new ExpectedPluginHandler(getContext()).expectedListMovements(call);
  }

  @PluginMethod
  public void expectedResolveMovement(PluginCall call) {
    new ExpectedPluginHandler(getContext()).expectedResolveMovement(call);
  }

  @PluginMethod
  public void expectedDismissMovement(PluginCall call) {
    new ExpectedPluginHandler(getContext()).expectedDismissMovement(call);
  }

  @PluginMethod
  public void expectedPostMovement(PluginCall call) {
    new ExpectedPluginHandler(getContext()).expectedPostMovement(call);
  }

  @PluginMethod
  public void sharingListPeople(PluginCall call) { new SharingPluginHandler(getContext()).sharingListPeople(call); }
  @PluginMethod
  public void sharingApplyShareToPostedTransaction(PluginCall call) { new SharingPluginHandler(getContext()).sharingApplyShareToPostedTransaction(call); }
  @PluginMethod
  public void sharingGetMovementDetails(PluginCall call) { new SharingPluginHandler(getContext()).sharingGetMovementDetails(call); }
  @PluginMethod
  public void sharingListMovementDetails(PluginCall call) { new SharingPluginHandler(getContext()).sharingListMovementDetails(call); }
  @PluginMethod
  public void sharingGetPlannedShare(PluginCall call) { new SharingPluginHandler(getContext()).sharingGetPlannedShare(call); }
  @PluginMethod
  public void analyticsSetMovementIgnored(PluginCall call) { new AnalyticsPluginHandler(getContext()).analyticsSetMovementIgnored(call); }
  @PluginMethod
  public void analyticsListIgnoredMovements(PluginCall call) { new AnalyticsPluginHandler(getContext()).analyticsListIgnoredMovements(call); }
}
