package dev.solidcoder.speech

interface StreamingSpeechTranscriber {
    suspend fun start(request: StreamingTranscriptionRequest): StreamingTranscriptionSession
}

interface StreamingTranscriptionSession {
    suspend fun accept(chunk: AudioChunk)

    suspend fun finish(): TranscriptionResult

    suspend fun cancel()
}

data class StreamingTranscriptionRequest(
    val language: String? = null,
    val detectLanguageAutomatically: Boolean = language == null,
) {
    init {
        require(language == null || language.trim().isNotEmpty()) { "language cannot be blank" }
        require(language == null || !detectLanguageAutomatically) {
            "automatic language detection cannot be combined with an explicit language"
        }
    }
}

data class AudioChunk(
    val samples: FloatArray,
    val sampleRateHz: Int,
) {
    init {
        require(samples.isNotEmpty()) { "audio chunk cannot be empty" }
        require(sampleRateHz > 0) { "audio chunk sample rate must be positive" }
    }
}
