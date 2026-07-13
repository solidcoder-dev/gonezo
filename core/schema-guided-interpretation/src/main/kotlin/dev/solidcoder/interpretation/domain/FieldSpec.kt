package dev.solidcoder.interpretation.domain

@JvmInline
value class FieldKey private constructor(val value: String) {
  companion object {
    private val pattern = Regex("^[a-z][A-Za-z0-9]*$")

    fun of(raw: String): FieldKey {
      val normalized = raw.trim()
      require(pattern.matches(normalized)) {
        "field key must match ${pattern.pattern}"
      }
      return FieldKey(normalized)
    }
  }

  override fun toString(): String = value
}

@JvmInline
value class FieldDescription private constructor(val value: String) {
  companion object {
    fun of(raw: String): FieldDescription {
      val normalized = raw.trim()
      require(normalized.isNotEmpty()) { "field description is required" }
      return FieldDescription(normalized)
    }
  }

  override fun toString(): String = value
}

enum class FieldType {
  TEXT,
  DECIMAL,
  DATE,
  ENUM,
  BOOLEAN,
  INTEGER,
}

data class AllowedValue(
  val stableValue: String,
  val label: String,
  val description: String? = null,
) {
  init {
    require(stableValue.isNotBlank()) { "allowed value stableValue is required" }
    require(label.isNotBlank()) { "allowed value label is required" }
    require(description == null || description.isNotBlank()) { "allowed value description cannot be blank" }
  }
}

data class FieldSpec(
  val key: FieldKey,
  val description: FieldDescription,
  val type: FieldType,
  val allowedValues: List<AllowedValue> = emptyList(),
  val required: Boolean = false,
  val format: String? = null,
) {
  init {
    require(format == null || format.isNotBlank()) { "field format cannot be blank" }
    val stableValues = allowedValues.map { it.stableValue }
    require(stableValues.distinct().size == stableValues.size) {
      "allowed values must be unique by stableValue"
    }

    when (type) {
      FieldType.ENUM -> require(allowedValues.isNotEmpty()) {
        "enum fields must declare at least one allowed value"
      }
      else -> require(allowedValues.isEmpty()) {
        "allowed values are only supported for enum fields"
      }
    }
  }

  fun allows(stableValue: String): Boolean = allowedValues.any { it.stableValue == stableValue }
}
