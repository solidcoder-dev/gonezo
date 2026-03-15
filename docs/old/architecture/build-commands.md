# Build Commands

Canonical commands after core modularization.

## Core modules (independent)

- `cd core && ./gradlew checkLayerBoundaries test`
- `cd core && ./gradlew :domain:test`
- `cd core && ./gradlew :application:test`
- `cd core && ./gradlew :infrastructure:test`

## App build

- `cd app && npm run build`
- `cd app/android && ./gradlew :app:assembleDebug`
