# Gonezo

Gonezo is an Android-first React + TypeScript + Kotlin app.

## Quality Checks

- All-in-one local check: `./check`
- Frontend: `cd app && npm run check`
- Core: `cd core && ./gradlew test spotlessCheck checkLayerBoundaries`
- Android: `cd app/android && ./gradlew :app:lintDebug :app:testDebugUnitTest`
- Native: `clang-format --dry-run --Werror app/android/app/src/main/cpp/speech-transcription/whisper_jni.cpp`
- Native CMake: `cmake -S app/android/app/src/main/cpp/speech-transcription -B /tmp/gonezo-whisper-jni -DGONEZO_ENABLE_CLANG_TIDY=ON`

## Static Analysis

- ESLint is type-aware and includes JSX accessibility rules.
- `dependency-cruiser` enforces frontend architecture with a baseline for inherited violations.
- Spotless enforces Kotlin and Gradle formatting in the JVM build.
- ArchUnit enforces core layer and bounded-context boundaries.

## Tooling Decision

`detekt` is intentionally deferred for now because there is no stable release aligned with Kotlin 2.3.x in this toolchain. Revisit it when a stable compatible release is available.
