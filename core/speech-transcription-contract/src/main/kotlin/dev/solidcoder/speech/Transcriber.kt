package dev.solidcoder.speech

@JvmInline
value class AudioInput private constructor(val source: AudioSourceRef) {
  companion object {
    fun of(raw: String): AudioInput = AudioInput(AudioSourceRef.of(raw))
  }

  override fun toString(): String = source.toString()
}

fun interface Transcriber {
  suspend fun transcribe(audio: AudioInput): Transcript
}
