# Local speech transcription

The speech boundary is a pure Kotlin/JVM module at `core/speech-transcription-contract`. It models an opaque `AudioSourceRef`, an optional language, optional segments, empty results, cancellation, and recoverable or definitive issues.

Android keeps the implementation behind `SpeechTranscriptionPlugin`. The plugin resolves the opaque reference inside the private audio-capture directory, decodes only PCM 16-bit mono 16 kHz WAV data, runs the JNI call on a single worker executor, and reuses one lazily-created Whisper context until the model path changes or the plugin is destroyed.

The local voice pipeline now continues after transcription:

`Audio -> Whisper local -> transcript -> OnDeviceInputInterpreter -> LiteRtStructuredGenerationRuntime (GPU-only Gemma 3 1B dynamic-int4 QAT) -> strict JSON -> composer`

There is no heuristic or regex-based financial fallback in the voice path.

The native build pins `whisper.cpp` v1.7.6 through CMake `FetchContent` when no local checkout is supplied, including a SHA-256 URL hash. The Android `prepareSpeechModel` task packages the configured `ggml-tiny.bin` asset during the build and validates its expected size and SHA-256. Runtime model metadata is declared in the manifest and validated before the model is loaded. A different model must provide the same metadata keys with its own immutable asset and hash. This is a build-time dependency; the application does not perform network calls for transcription.

Interpretation now uses a separate, local LiteRT-LM model on Android. The current file is `Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm`; the model file is not versioned in Git; the build checks the staged file size and SHA-256 and copies the verified artifact into private app storage before inference.

No target-device measurements are available in this repository environment. The development measurement checklist is:

- initial model load time;
- first and subsequent transcription time;
- first and subsequent interpretation time;
- real-time factor for transcription (`transcriptionMs / audioDurationMs`);
- peak process memory;
- model and APK/AAB size delta.

To smoke test the full local voice flow on a device, transcribe and interpret these phrases:

- `Ayer pagué treinta euros en la peluquería`
- `Hoy me ingresaron la nómina de mil ochocientos euros`
- `Compré comida por 12,50`
- `Recibí 25 euros de devolución`
- `Pagué algo`
