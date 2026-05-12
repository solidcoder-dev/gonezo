# User Preferences

## Objetivo

Guardar preferencias del usuario sin contaminar otros bounded contexts.
La primera preferencia implementada es la cuenta por defecto al abrir la app.

## Modelo YAGNI

`preferences` es un bounded context propio:

- `UserPreferences`
- `PreferencesOwnerId`
- `DefaultAccountId`

La preferencia guarda solo la identidad de la cuenta. `ledger` sigue siendo dueño de las cuentas y
`preferences` no valida si una cuenta existe, esta activa o archivada.

## Persistencia Android

```sql
user_preferences(
  owner_id text primary key,
  default_account_id text null,
  updated_at text not null
)
```

Por ahora `owner_id = 'local-user'`.

## Resolucion en UI

Al cargar cuentas:

1. si hay cuenta seleccionada/preferida activa, se mantiene;
2. si no, se usa `defaultAccountId` cuando apunta a una cuenta activa;
3. si no, se usa la primera cuenta activa;
4. las cuentas archivadas nunca se abren como default.

## Evolucion

Cuando aparezca una preferencia compleja real, se puede anadir una columna typed o una tabla/seccion
especifica. No se usa key/value generico para no perder lenguaje ubicuo ni validacion.
