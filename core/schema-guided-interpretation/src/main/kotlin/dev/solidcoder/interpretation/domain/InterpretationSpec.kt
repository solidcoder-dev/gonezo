package dev.solidcoder.interpretation.domain

@JvmInline
value class InterpretationSpecId private constructor(val value: String) {
  companion object {
    private val pattern = Regex("^[a-z][a-z0-9-]*$")

    fun of(raw: String): InterpretationSpecId {
      val normalized = raw.trim()
      require(pattern.matches(normalized)) {
        "interpretation spec id must match ${pattern.pattern}"
      }
      return InterpretationSpecId(normalized)
    }
  }

  override fun toString(): String = value
}

@JvmInline
value class InterpretationSpecVersion private constructor(val value: String) {
  companion object {
    private val pattern = Regex("^[A-Za-z0-9][A-Za-z0-9._-]*$")

    fun of(raw: String): InterpretationSpecVersion {
      val normalized = raw.trim()
      require(pattern.matches(normalized)) {
        "interpretation spec version must match ${pattern.pattern}"
      }
      return InterpretationSpecVersion(normalized)
    }
  }

  override fun toString(): String = value
}

data class InterpretationSpec(
  val id: InterpretationSpecId,
  val version: InterpretationSpecVersion,
  val fields: List<FieldSpec>,
) {
  init {
    require(fields.isNotEmpty()) { "interpretation spec must declare at least one field" }

    val keys = fields.map { it.key }
    require(keys.distinct().size == keys.size) { "interpretation spec field keys must be unique" }
  }

  fun fieldByKey(key: FieldKey): FieldSpec? = fields.firstOrNull { it.key == key }
}
