# Gonezo App

React + TypeScript + Vite UI packaged with Capacitor.

Current development target is Android. The UI runs in the Android shell and calls the native `CorePlugin`, which delegates to the Kotlin core through the Android infrastructure adapters in `platforms/android/infrastructure`.

Web and iOS support are future targets. Keep their files stable unless a task explicitly asks for them.

## Checks

Run from `app/`:

```sh
npm run check:structure
npm run lint
npm test
npm run build
```

## Android Runtime

- `app/android/app/src/main/java/com/gonezo/multiplatform/plugins/CorePlugin.java`: Capacitor plugin surface.
- `platforms/android/infrastructure/src/main/java/com/gonezo/multiplatform/core/*`: Android persistence/runtime composition for the Kotlin core.
- `app/src/shared/infrastructure/core/coreAdapter.ts`: selects native Android plugin calls when running on a native platform.

The web adapter exists for tests and later web work; it is not the production target right now.

## Local model setup

The Android interpretation runtime uses a locally provisioned LiteRT-LM model file. The build expects the file to exist at:

```text
android/third_party/Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm
```

Accept the Gemma license on Hugging Face first, then download it with the official `hf` CLI:

```bash
hf auth login
hf download litert-community/Gemma3-1B-IT Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm \
  --local-dir android/third_party
```

The build validates the file before use:

- expected size: `584417280`
- SHA-256: `1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be`

If the file is missing or does not match the expected checksum, Android build tasks fail fast with a model provisioning error.
