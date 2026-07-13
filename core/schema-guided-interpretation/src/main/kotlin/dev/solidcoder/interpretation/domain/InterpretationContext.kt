package dev.solidcoder.interpretation.domain

@JvmInline
value class ContextKey private constructor(val value: String) {
  companion object {
    private val pattern = Regex("^[a-z][A-Za-z0-9]*$")

    fun of(raw: String): ContextKey {
      val normalized = raw.trim()
      require(pattern.matches(normalized)) {
        "context key must match ${pattern.pattern}"
      }
      return ContextKey(normalized)
    }
  }

  override fun toString(): String = value
}

data class ContextEntry(
  val key: ContextKey,
  val value: StructuredValue,
)

data class InterpretationContext(
  val entries: List<ContextEntry> = emptyList(),
) {
  init {
    val keys = entries.map { it.key }
    require(keys.distinct().size == keys.size) { "interpretation context keys must be unique" }
  }

  fun valueOf(key: ContextKey): StructuredValue? = entries.firstOrNull { it.key == key }?.value
}
