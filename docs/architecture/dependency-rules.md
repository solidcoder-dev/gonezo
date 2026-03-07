# Dependency Rules

Target architecture is DDD with low coupling and platform adapters.

## Layers

- `core/domain`: entities, value objects, domain services, domain events, repository interfaces.
- `core/application`: use case orchestration and application services.
- `core/infrastructure`: implementations of ports (persistence, events, platform resources).
- `platforms/*/plugin-core`: platform bridge (Capacitor plugin API adapters).
- `apps/mobile`: UI and app composition.

## Allowed Dependencies

- `core/domain` -> no framework or platform module.
- `core/application` -> `core/domain`.
- `core/infrastructure` -> `core/domain`, `core/application`.
- `platforms/*/plugin-core` -> `core/application`, `core/infrastructure`, `core/domain`.
- `apps/mobile` -> contracts/adapters only (no direct domain infrastructure imports).

## Forbidden Dependencies

- `core/domain` -> `core/infrastructure`, `platforms/*`, `apps/*`, Capacitor, Spring.
- `core/application` -> `platforms/*`, `apps/*`.
- `apps/mobile` -> direct imports from native persistence implementation details.

## Migration Notes

- Repository interfaces remain in domain.
- Repository implementations remain in infrastructure.
- Plugin classes must stay thin and delegate to application services.
