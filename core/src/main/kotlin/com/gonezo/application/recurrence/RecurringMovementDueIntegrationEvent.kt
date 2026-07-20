package com.gonezo.recurrence.application

import org.json.JSONObject
import java.util.UUID

data class RecurringMovementDueIntegrationEvent(
  val eventId: UUID,
  val recurringMovementId: String,
  val occurrenceId: String,
  val dueAt: String,
  val movementType: String,
  val sourceAccountId: String,
  val targetAccountId: String?,
  val amount: String,
  val currency: String,
  val destinationAmount: String?,
  val destinationCurrency: String?,
  val exchangeRate: String?,
  val description: String?,
  val merchant: String?,
  val categoryId: String? = null,
  val tagNames: List<String> = emptyList(),
  val reviewPolicy: String = "automatic",
  val splitItems: List<SplitItem> = emptyList(),
) {
  data class SplitItem(
    val id: String,
    val name: String,
    val amount: String,
  )

  fun toJson(): String = JSONObject()
    .put("eventId", eventId.toString())
    .put("recurringMovementId", recurringMovementId)
    .put("occurrenceId", occurrenceId)
    .put("dueAt", dueAt)
    .put("movementType", movementType)
    .put("sourceAccountId", sourceAccountId)
    .put("targetAccountId", targetAccountId)
    .put("amount", amount)
    .put("currency", currency)
    .put("destinationAmount", destinationAmount)
    .put("destinationCurrency", destinationCurrency)
    .put("exchangeRate", exchangeRate)
    .put("description", description)
    .put("merchant", merchant)
    .put("categoryId", categoryId)
    .put("tagNames", tagNames)
    .put("reviewPolicy", reviewPolicy)
    .put("splitItems", splitItems.map { split ->
      JSONObject()
        .put("id", split.id)
        .put("name", split.name)
        .put("amount", split.amount)
    })
    .toString()

  companion object {
    const val EVENT_TYPE = "recurrence.recurring_movement_due.v1"

    fun fromJson(json: String): RecurringMovementDueIntegrationEvent {
      val parsed = JSONObject(json)
      return RecurringMovementDueIntegrationEvent(
        eventId = UUID.fromString(parsed.getString("eventId")),
        recurringMovementId = parsed.getString("recurringMovementId"),
        occurrenceId = parsed.getString("occurrenceId"),
        dueAt = parsed.getString("dueAt"),
        movementType = parsed.getString("movementType"),
        sourceAccountId = parsed.getString("sourceAccountId"),
        targetAccountId = parsed.optString("targetAccountId", "").ifBlank { null },
        amount = parsed.getString("amount"),
        currency = parsed.getString("currency"),
        destinationAmount = parsed.optString("destinationAmount", "").ifBlank { null },
        destinationCurrency = parsed.optString("destinationCurrency", "").ifBlank { null },
        exchangeRate = parsed.optString("exchangeRate", "").ifBlank { null },
        description = parsed.optString("description", "").ifBlank { null },
        merchant = parsed.optString("merchant", "").ifBlank { null },
        categoryId = parsed.optString("categoryId", "").ifBlank { null },
        tagNames = parsed.optJSONArray("tagNames")?.let { tags -> buildList { for (index in 0 until tags.length()) add(tags.getString(index)) } } ?: emptyList(),
        reviewPolicy = parsed.optString("reviewPolicy", "automatic"),
        splitItems = parsed.optJSONArray("splitItems")?.let { items ->
          buildList {
            for (index in 0 until items.length()) {
              val item = items.getJSONObject(index)
              add(
                SplitItem(
                  id = item.getString("id"),
                  name = item.getString("name"),
                  amount = item.getString("amount"),
                ),
              )
            }
          }
        } ?: emptyList(),
      )
    }
  }
}
