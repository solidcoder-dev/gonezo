package com.gonezo.application.orchestration.interpretation

import dev.solidcoder.interpretation.domain.FieldType
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class MovementEntryInterpretationSpecFactoryTest {

  private val factory = MovementEntryInterpretationSpecFactory()

  @Test
  fun `generates exactly the five expected fields`() {
    val spec = factory.create(categoryOptions())

    assertThat(spec.fields.map { it.key.value }).containsExactly(
      "type",
      "amount",
      "occurredOn",
      "note",
      "categoryId",
    )
  }

  @Test
  fun `uses stable keys and correct types with non empty semantic descriptions`() {
    val spec = factory.create(categoryOptions())

    assertThat(spec.fieldByKey(dev.solidcoder.interpretation.domain.FieldKey.of("type"))!!.type).isEqualTo(FieldType.ENUM)
    assertThat(spec.fieldByKey(dev.solidcoder.interpretation.domain.FieldKey.of("amount"))!!.type).isEqualTo(FieldType.DECIMAL)
    assertThat(spec.fieldByKey(dev.solidcoder.interpretation.domain.FieldKey.of("occurredOn"))!!.type).isEqualTo(FieldType.DATE)
    assertThat(spec.fieldByKey(dev.solidcoder.interpretation.domain.FieldKey.of("note"))!!.type).isEqualTo(FieldType.TEXT)
    assertThat(spec.fieldByKey(dev.solidcoder.interpretation.domain.FieldKey.of("categoryId"))!!.type).isEqualTo(FieldType.ENUM)
    assertThat(spec.fields.map { it.description.value }).allMatch { it.isNotBlank() }
  }

  @Test
  fun `exposes expense and income as allowed values for type`() {
    val spec = factory.create(categoryOptions())

    val typeField = spec.fieldByKey(dev.solidcoder.interpretation.domain.FieldKey.of("type"))!!
    assertThat(typeField.allowedValues.map { it.stableValue }).containsExactly("expense", "income")
  }

  @Test
  fun `converts dynamic categories to allowed values preserving id and label`() {
    val spec = factory.create(categoryOptions())

    val categoryField = spec.fieldByKey(dev.solidcoder.interpretation.domain.FieldKey.of("categoryId"))!!
    assertThat(categoryField.allowedValues.map { it.stableValue }).containsExactly("cat-food", "cat-salary")
    assertThat(categoryField.allowedValues.map { it.label }).containsExactly("Food", "Salary")
    assertThat(categoryField.allowedValues.map { it.description }).containsExactly("Meals and groceries", null)
  }

  @Test
  fun `factory public contract does not expose taxonomy or ledger entities`() {
    val parameterType = MovementEntryInterpretationSpecFactory::class.java.methods
      .single { it.name == "create" }
      .parameterTypes
      .single()
      .typeName

    assertThat(parameterType).doesNotContain("taxonomy")
    assertThat(parameterType).doesNotContain("ledger")
  }

  @Test
  fun `omits category when no category options exist`() {
    assertThat(factory.create(emptyList()).fields.map { it.key.value })
      .containsExactly("type", "amount", "occurredOn", "note")
  }

  @Test
  fun `rejects duplicate category stable keys`() {
    assertThatThrownBy {
      factory.create(listOf(MovementEntryCategoryOption("same", "One"), MovementEntryCategoryOption("same", "Two")))
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  private fun categoryOptions(): List<MovementEntryCategoryOption> = listOf(
    MovementEntryCategoryOption(
      id = "cat-food",
      label = "Food",
      description = "Meals and groceries",
    ),
    MovementEntryCategoryOption(
      id = "cat-salary",
      label = "Salary",
    ),
  )
}
