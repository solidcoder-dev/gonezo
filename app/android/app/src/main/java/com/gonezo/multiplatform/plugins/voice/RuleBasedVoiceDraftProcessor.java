package com.gonezo.multiplatform.plugins.voice;

import com.getcapacitor.JSObject;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;

public final class RuleBasedVoiceDraftProcessor implements VoiceDraftProcessor {
  @Override
  public JSObject process(VoiceDraftProcessingInput input) {
    String normalizedTranscript = normalize(input.transcript());
    String parsedAmount = parseVoiceAmount(normalizedTranscript);

    JSObject draft = new JSObject();
    draft.put("type", input.expectedType());
    draft.put("amount", parsedAmount == null ? defaultAmount(input.expectedType()) : parsedAmount);
    draft.put("occurredAt", input.occurredAt());
    draft.put("note", normalizedTranscript == null ? "" : normalizedTranscript);

    if ("transfer".equals(input.expectedType())) {
      String transferTarget = resolveVoiceTransferTargetAccountId(input.accountId(), normalizedTranscript, input.accounts());
      if (transferTarget != null) {
        draft.put("transferToAccountId", transferTarget);
      }
    } else {
      String categoryName = resolveVoiceCategoryName(normalizedTranscript, input.categories());
      if (categoryName != null) {
        draft.put("categoryName", categoryName);
      }
    }

    JSONArray tagNames = parseVoiceTagNames(normalizedTranscript);
    if (tagNames.length() > 0) {
      draft.put("tagNames", tagNames);
    }

    return draft;
  }

  private String defaultAmount(String expectedType) {
    if ("income".equals(expectedType)) {
      return "100.00";
    }
    if ("transfer".equals(expectedType)) {
      return "25.00";
    }
    return "10.00";
  }

  private String parseVoiceAmount(String utterance) {
    if (utterance == null) {
      return null;
    }
    Matcher matcher = Pattern.compile("([-+]?\\d+[\\d.,]*)").matcher(utterance);
    if (!matcher.find()) {
      return null;
    }
    BigDecimal amount = parseDecimal(matcher.group(1));
    if (amount == null) {
      return null;
    }
    return amount.abs().toPlainString();
  }

  private String resolveVoiceTransferTargetAccountId(
    String sourceAccountId,
    String utterance,
    List<AndroidLedgerCore.LedgerAccountView> accounts
  ) {
    if (utterance == null) {
      return null;
    }
    String normalizedUtterance = utterance.toLowerCase(Locale.ROOT);
    for (AndroidLedgerCore.LedgerAccountView account : accounts) {
      if (account.id().equals(sourceAccountId)) {
        continue;
      }
      String normalizedName = normalize(account.name());
      if (normalizedName != null && normalizedUtterance.contains(normalizedName)) {
        return account.id();
      }
    }
    return null;
  }

  private String resolveVoiceCategoryName(
    String utterance,
    List<AndroidTaxonomyCore.TaxonomyCategoryView> categories
  ) {
    if (utterance == null) {
      return null;
    }
    String normalizedUtterance = utterance.toLowerCase(Locale.ROOT);
    for (AndroidTaxonomyCore.TaxonomyCategoryView category : categories) {
      String normalizedName = normalize(category.name());
      if (normalizedName != null && normalizedUtterance.contains(normalizedName)) {
        return category.name();
      }
    }
    return null;
  }

  private JSONArray parseVoiceTagNames(String utterance) {
    JSONArray tags = new JSONArray();
    if (utterance == null) {
      return tags;
    }
    LinkedHashMap<String, String> uniqueByNormalizedName = new LinkedHashMap<>();
    Matcher matcher = Pattern.compile("#([\\p{L}\\p{N}_-]+)").matcher(utterance);
    while (matcher.find()) {
      String tag = normalize(matcher.group(1));
      if (tag == null) {
        continue;
      }
      String normalizedTag = tag.toLowerCase(Locale.ROOT);
      if (!uniqueByNormalizedName.containsKey(normalizedTag)) {
        uniqueByNormalizedName.put(normalizedTag, tag);
      }
    }
    for (String tagName : uniqueByNormalizedName.values()) {
      tags.put(tagName);
    }
    return tags;
  }

  private BigDecimal parseDecimal(String value) {
    String normalized = normalize(value);
    if (normalized == null) {
      return null;
    }

    normalized = normalized
      .replace(" ", "")
      .replace("\u00A0", "")
      .replace("€", "")
      .replace("$", "")
      .replace("£", "")
      .replace("+", "");

    if (normalized.contains(",") && normalized.contains(".")) {
      int commaPos = normalized.lastIndexOf(',');
      int dotPos = normalized.lastIndexOf('.');
      if (commaPos > dotPos) {
        normalized = normalized.replace(".", "").replace(",", ".");
      } else {
        normalized = normalized.replace(",", "");
      }
    } else if (normalized.contains(",")) {
      normalized = normalized.replace(",", ".");
    }

    try {
      return new BigDecimal(normalized);
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  private String normalize(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
