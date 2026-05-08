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
