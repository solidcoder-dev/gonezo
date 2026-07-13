package dev.solidcoder.interpretation

import dev.solidcoder.interpretation.domain.AllowedValue
import dev.solidcoder.interpretation.domain.FieldDescription
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.FieldType
import dev.solidcoder.interpretation.domain.InterpretationSpec
import dev.solidcoder.interpretation.domain.InterpretationSpecId
import dev.solidcoder.interpretation.domain.InterpretationSpecVersion
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class InterpretationSpecTest {

  @Test
  fun `creates a valid interpretation spec`() {
    val spec = InterpretationSpec(
      id = InterpretationSpecId.of("purchase"),
      version = InterpretationSpecVersion.of("1"),
      fields = listOf(textField("note"), enumField("type", "alpha", "beta")),
    )

    assertThat(spec.fields).hasSize(2)
  }

  @Test
  fun `rejects a spec without fields`() {
    assertThatThrownBy {
      InterpretationSpec(
        id = InterpretationSpecId.of("purchase"),
        version = InterpretationSpecVersion.of("1"),
        fields = emptyList(),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects duplicate field keys`() {
    assertThatThrownBy {
      InterpretationSpec(
        id = InterpretationSpecId.of("purchase"),
        version = InterpretationSpecVersion.of("1"),
        fields = listOf(textField("note"), textField("note")),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects blank ids keys or descriptions`() {
    assertThatThrownBy { InterpretationSpecId.of(" ") }.isInstanceOf(IllegalArgumentException::class.java)
    assertThatThrownBy { FieldKey.of(" ") }.isInstanceOf(IllegalArgumentException::class.java)
    assertThatThrownBy { FieldDescription.of(" ") }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects duplicate allowed values`() {
    assertThatThrownBy {
      FieldSpec(
        key = FieldKey.of("type"),
        description = FieldDescription.of("Choice direction"),
        type = FieldType.ENUM,
        allowedValues = listOf(
          AllowedValue("alpha", "Alpha"),
          AllowedValue("alpha", "Alpha copy"),
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects enum fields without allowed values`() {
    assertThatThrownBy {
      FieldSpec(
        key = FieldKey.of("type"),
        description = FieldDescription.of("Choice direction"),
        type = FieldType.ENUM,
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects allowed values on non enum fields`() {
    assertThatThrownBy {
      FieldSpec(
        key = FieldKey.of("amount"),
        description = FieldDescription.of("Quantity"),
        type = FieldType.DECIMAL,
        allowedValues = listOf(AllowedValue("alpha", "Alpha")),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  private fun textField(key: String): FieldSpec = FieldSpec(
    key = FieldKey.of(key),
    description = FieldDescription.of("Description for $key"),
    type = FieldType.TEXT,
  )

  private fun enumField(key: String, first: String, second: String): FieldSpec = FieldSpec(
    key = FieldKey.of(key),
    description = FieldDescription.of("Description for $key"),
    type = FieldType.ENUM,
    allowedValues = listOf(
      AllowedValue(first, first.replaceFirstChar(Char::uppercase)),
      AllowedValue(second, second.replaceFirstChar(Char::uppercase)),
    ),
  )
}
