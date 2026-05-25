package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidRecurringCore;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

final class RecurringPluginHandler {
  private final Context context;

  RecurringPluginHandler(Context context) {
    this.context = context;
  }

  void recurrenceCreateRecurringMovement(PluginCall call) {
    try {
      UUID id = AndroidRecurringCore.getInstance(context).createRecurringMovement(
        new AndroidRecurringCore.CreateRecurringMovementInput(
          normalizedType(call.getString("type", "expense")),
          call.getString("sourceAccountId"),
          nullIfBlank(call.getString("targetAccountId")),
          call.getString("amount"),
          call.getString("currency"),
          nullIfBlank(call.getString("destinationAmount")),
          nullIfBlank(call.getString("destinationCurrency")),
          nullIfBlank(call.getString("exchangeRate")),
          nullIfBlank(call.getString("description")),
          nullIfBlank(call.getString("merchant")),
          nullIfBlank(call.getString("categoryId")),
          toJsonStringOrNull(call.getArray("splitItems")),
          toRecurringRuleInput(call.getObject("rule")),
          toRecurrenceEndInput(call.getObject("recurrenceEnd")),
          call.getString("startAt", Instant.now().toString()),
          defaultZoneId(call.getString("zoneId", "UTC"))
        )
      );

      JSObject result = new JSObject();
      result.put("id", id.toString());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void recurrenceUpdateRecurringMovement(PluginCall call) {
    try {
      UUID id = AndroidRecurringCore.getInstance(context).updateRecurringMovement(
        new AndroidRecurringCore.UpdateRecurringMovementInput(
          call.getString("recurringMovementId"),
          normalizedType(call.getString("type", "expense")),
          call.getString("sourceAccountId"),
          nullIfBlank(call.getString("targetAccountId")),
          call.getString("amount"),
          call.getString("currency"),
          nullIfBlank(call.getString("destinationAmount")),
          nullIfBlank(call.getString("destinationCurrency")),
          nullIfBlank(call.getString("exchangeRate")),
          nullIfBlank(call.getString("description")),
          nullIfBlank(call.getString("merchant")),
          nullIfBlank(call.getString("categoryId")),
          toJsonStringOrNull(call.getArray("splitItems")),
          toRecurringRuleInput(call.getObject("rule")),
          toRecurrenceEndInput(call.getObject("recurrenceEnd")),
          call.getString("startAt", Instant.now().toString()),
          defaultZoneId(call.getString("zoneId", "UTC"))
        )
      );

      JSObject result = new JSObject();
      result.put("id", id.toString());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void recurrenceDeactivateRecurringMovement(PluginCall call) {
    try {
      AndroidRecurringCore.getInstance(context).deactivateRecurringMovement(
        call.getString("recurringMovementId"),
        call.getString("deactivatedAt", Instant.now().toString())
      );
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void recurrenceListRecurringMovements(PluginCall call) {
    try {
      String accountId = nullIfBlank(call.getString("sourceAccountId"));
      if (accountId == null) {
        throw new IllegalArgumentException("sourceAccountId is required");
      }
      List<AndroidRecurringCore.RecurringMovementView> items =
        AndroidRecurringCore.getInstance(context).listRecurringMovements(accountId);
      JSONArray array = new JSONArray();
      for (AndroidRecurringCore.RecurringMovementView item : items) {
        array.put(toRecurringMovementJson(item));
      }
      JSObject result = new JSObject();
      result.put("items", array);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  private AndroidRecurringCore.RecurrenceRuleInput toRecurringRuleInput(JSObject rawRule) {
    JSObject rule = rawRule == null ? new JSObject() : rawRule;
    JSONArray rawWeeklyDays = rule.optJSONArray("weeklyDays");
    List<Integer> weeklyDays = new ArrayList<>();
    if (rawWeeklyDays != null) {
      for (int index = 0; index < rawWeeklyDays.length(); index++) {
        if (rawWeeklyDays.isNull(index)) {
          continue;
        }
        int value = rawWeeklyDays.optInt(index, Integer.MIN_VALUE);
        if (value != Integer.MIN_VALUE) {
          weeklyDays.add(value);
        }
      }
    }
    String frequency = nullIfBlank(rule.optString("frequency", null));
    String monthlyPattern = nullIfBlank(rule.optString("monthlyPattern", null));
    Integer interval = nullableInteger(rule, "interval");
    Integer dayOfMonth = nullableInteger(rule, "dayOfMonth");
    Integer monthlyWeekOrdinal = nullableInteger(rule, "monthlyWeekOrdinal");
    Integer monthlyWeekday = nullableInteger(rule, "monthlyWeekday");
    return new AndroidRecurringCore.RecurrenceRuleInput(
      frequency == null ? "daily" : frequency,
      interval == null ? 1 : interval,
      weeklyDays,
      monthlyPattern == null ? "day_of_month" : monthlyPattern,
      dayOfMonth,
      monthlyWeekOrdinal,
      monthlyWeekday
    );
  }

  private AndroidRecurringCore.RecurrenceEndInput toRecurrenceEndInput(JSObject rawRecurrenceEnd) {
    JSObject recurrenceEnd = rawRecurrenceEnd == null ? new JSObject() : rawRecurrenceEnd;
    String kind = nullIfBlank(recurrenceEnd.optString("kind", null));
    String onDate = nullIfBlank(recurrenceEnd.optString("onDate", null));
    Integer afterOccurrences = nullableInteger(recurrenceEnd, "afterOccurrences");
    return new AndroidRecurringCore.RecurrenceEndInput(
      kind == null ? "never" : kind,
      onDate,
      afterOccurrences
    );
  }

  private JSObject toRecurringMovementJson(AndroidRecurringCore.RecurringMovementView movement) {
    JSObject result = new JSObject();
    result.put("id", movement.getId());
    result.put("type", movement.getType());
    result.put("sourceAccountId", movement.getSourceAccountId());
    result.put("targetAccountId", movement.getTargetAccountId());
    result.put("amount", movement.getAmount());
    result.put("currency", movement.getCurrency());
    result.put("destinationAmount", movement.getDestinationAmount());
    result.put("destinationCurrency", movement.getDestinationCurrency());
    result.put("exchangeRate", movement.getExchangeRate());
    result.put("description", movement.getDescription());
    result.put("merchant", movement.getMerchant());
    result.put("categoryId", movement.getCategoryId());
    JSONArray splitItems = new JSONArray();
    for (AndroidRecurringCore.SplitItem item : movement.getSplitItems()) {
      JSObject split = new JSObject();
      split.put("id", item.getId());
      split.put("name", item.getName());
      split.put("amount", item.getAmount());
      splitItems.put(split);
    }
    result.put("splitItems", splitItems);
    result.put("status", movement.getStatus());
    result.put("startAt", movement.getStartAt());
    result.put("nextDueAt", movement.getNextDueAt());
    result.put("zoneId", movement.getZoneId());
    result.put("generatedOccurrences", movement.getGeneratedOccurrences());
    result.put("rule", toRecurrenceRuleJson(movement.getRule()));
    result.put("recurrenceEnd", toRecurrenceEndJson(movement.getRecurrenceEnd()));
    return result;
  }

  private JSObject toRecurrenceRuleJson(AndroidRecurringCore.RecurrenceRuleInput rule) {
    JSObject result = new JSObject();
    result.put("frequency", rule.getFrequency());
    result.put("interval", rule.getInterval());
    JSONArray weeklyDays = new JSONArray();
    for (Integer day : rule.getWeeklyDays()) {
      weeklyDays.put(day);
    }
    result.put("weeklyDays", weeklyDays);
    result.put("monthlyPattern", rule.getMonthlyPattern());
    result.put("dayOfMonth", rule.getDayOfMonth());
    result.put("monthlyWeekOrdinal", rule.getMonthlyWeekOrdinal());
    result.put("monthlyWeekday", rule.getMonthlyWeekday());
    return result;
  }

  private JSObject toRecurrenceEndJson(AndroidRecurringCore.RecurrenceEndInput recurrenceEnd) {
    JSObject result = new JSObject();
    result.put("kind", recurrenceEnd.getKind());
    result.put("onDate", recurrenceEnd.getOnDate());
    result.put("afterOccurrences", recurrenceEnd.getAfterOccurrences());
    return result;
  }

  private Integer nullableInteger(JSONObject input, String key) {
    if (input == null || !input.has(key) || input.isNull(key)) {
      return null;
    }
    return input.optInt(key);
  }

  private String normalizedType(String type) {
    return type == null ? "expense" : type.trim().toLowerCase(Locale.ROOT);
  }

  private String defaultZoneId(String zoneId) {
    return zoneId == null ? "UTC" : zoneId.trim();
  }

  private String toJsonStringOrNull(JSONArray value) {
    return value == null ? null : value.toString();
  }

  private String nullIfBlank(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
