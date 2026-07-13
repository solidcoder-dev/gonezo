package dev.solidcoder.speech

@JvmInline
value class AudioSourceRef private constructor(val value: String) {
  companion object {
    fun of(raw: String): AudioSourceRef {
      val normalized = raw.trim()
      require(normalized.isNotEmpty()) { "audio source reference is required" }
      return AudioSourceRef(normalized)
    }
  }

  override fun toString(): String = value
}
