package com.gonezo.multiplatform.plugins.voice;

import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.util.List;

public record VoiceDraftProcessingInput(
  String accountId,
  String expectedType,
  String occurredAt,
  String transcript,
  List<AndroidLedgerCore.LedgerAccountView> accounts,
  List<AndroidTaxonomyCore.TaxonomyCategoryView> categories
) {}
