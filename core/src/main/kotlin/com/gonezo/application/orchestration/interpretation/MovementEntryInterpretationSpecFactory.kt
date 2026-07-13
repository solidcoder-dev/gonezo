package com.gonezo.application.orchestration.interpretation

import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion

data class MovementEntryCategoryOption(
  val id: String,
  val label: String,
  val description: String? = null,
) {
  init {
    require(id.isNotBlank()) { "category option id is required" }
    require(label.isNotBlank()) { "category option label is required" }
    require(description == null || description.isNotBlank()) { "category option description cannot be blank" }
  }
}

class MovementEntryInterpretationSpecFactory {
  fun create(categoryOptions: List<MovementEntryCategoryOption>): InterpretationSpec {
    val fields = buildList {
      add(enumField(
        key = "type",
        description = "Financial direction expressed by the user, distinguishing whether the movement is an expense or income.",
        allowedValues = listOf(
          AllowedValue("expense", "Expense"),
          AllowedValue("income", "Income"),
        ),
      ))
      add(field("amount", "Monetary amount mentioned by the user, represented as a decimal value without currency symbols.", FieldType.DECIMAL))
      add(field("occurredOn", "Date on which the described event happened, allowing future resolution from relative dates using context.", FieldType.DATE))
      add(field("note", "Brief textual note with the most relevant description, merchant, person, or concept mentioned by the user.", FieldType.TEXT))
      if (categoryOptions.isNotEmpty()) {
        add(enumField(
          key = "categoryId",
          description = "Category identifier that best matches the user's intent among the consumer-provided category options.",
          allowedValues = categoryOptions.map { category ->
            AllowedValue(category.id, category.label, category.description)
          },
        ))
      }
    }
    return InterpretationSpec(
      id = InterpretationSpecId.of("movement-entry"),
      version = InterpretationSpecVersion.of("v1"),
      fields = fields,
    )
  }

  private fun field(key: String, description: String, type: FieldType): FieldSpec = FieldSpec(
    key = FieldKey.of(key),
    description = FieldDescription.of(description),
    type = type,
  )

  private fun enumField(
    key: String,
    description: String,
    allowedValues: List<AllowedValue>,
  ): FieldSpec = FieldSpec(
    key = FieldKey.of(key),
    description = FieldDescription.of(description),
    type = FieldType.ENUM,
    allowedValues = allowedValues,
  )
}
