# Frontend Architecture

## Objetivo

Modelar el frontend por capacidades de usuario y no por modulos internos del backend.
La pantalla principal compone componentes de capacidad con contratos explicitos `required`/`provided`.

## Estructura actual

```text
app/src/
  App.tsx
  App.css
  main.tsx
  index.css

  account/
    application/
      AccountPage.tsx
      AccountHubComponent.tsx
      AccountSummaryComponent.tsx
      accountsCore.port.ts
      accountViewMappers.ts
    domain/
      accountPage.types.ts
      accountView.types.ts
    infrastructure/
      App.spec.tsx
    ui/
      AccountPageView.tsx
      accountPageView.contract.ts
      AccountSwitcherView.tsx
      capabilities/
        TransactionsImportComponent.tsx
        TransactionsImportComponent.contract.ts
      sections/
        StatusSection.tsx

  transactions/
    application/
      TransactionEntryComponent.tsx
      TransactionEntryComponent.contract.ts
      useTransactionEntryModel.ts
      transactionsCore.port.ts
      transactionViewMappers.ts
    domain/
      transactions.types.ts
      transactionView.types.ts
    ui/
      TransactionComposerView.tsx
      CategoryComboboxField.tsx
      TagComboboxField.tsx
    index.ts

  imports/
    application/
      TransactionsImportComponent.tsx
      useTransactionsImportController.ts
    domain/
      importFailureSummary.ts
      transactionsImport.types.ts
    infrastructure/
        readImportFileAsBase64.ts
        providers/
          mobills/
            mobillsFileReader.ts
    ui/
      TransactionsImportView.tsx
      TransactionsImportView.contract.ts
      TransactionsImportSummaryView.tsx
    index.ts

  ledger/
    application/*
    infrastructure/*

  expected/
    infrastructure/*

  scheduling/
    infrastructure/*

  movements/
    application/*
    domain/*
    ui/*

  taxonomy/
    application/*
    domain/*
    infrastructure/*

  shared/
    domain/
      corePort.ts
      schedulingKind.ts
    infrastructure/
      core/*
    testing/
      setup.ts
    utils/
      formatting.ts
```

## Responsabilidades

- `App.tsx`: bootstrap y routing.
- `account/application/AccountPage.tsx`: composicion cross-capability.
- `account/application/AccountHubComponent.tsx`: seleccion y gestion de cuentas.
- `account/application/AccountSummaryComponent.tsx`: resumen y acciones sobre cuenta seleccionada.
- `account/ui/capabilities/*`: importacion de alto nivel.
- `transactions/*`: composer transaccional y mappers.
- `movements/*`: monthly overview, posted/scheduled/expected lists, search and edit entrypoints.
- `imports/*`: capacidad de importacion como caja negra reutilizable. El backup Gonezo es el flujo por defecto; Mobills queda como flujo legado activado por checkbox.
- `preferences`: no tiene pantalla propia por ahora; se consume desde `account/application` para resolver la cuenta inicial y marcar la cuenta por defecto.
- `ledger/*` y `taxonomy/*`: acceso y reglas de backend; no definen la UX por si mismos.
- `expected/*` y `scheduling/*`: gateways de capacidades nativas/core.
- `shared/*`: utilidades neutrales.

## Convencion de contratos

- Contrato de layout de pagina (`*PageView`):
  - `required.screen`
  - `required.toast`
  - `required.sections` (slots ReactNode de subcomponentes)
  - `provided.toast.commands`
- Contrato de componente de capacidad (caja negra):
  - `required.context`
  - `required.config`
  - `provided.events` (solo si aplica)
- Contrato de vista interna:
  - `required.state`
  - `required.status`
  - `provided.commands`
- Las vistas no llaman a `core.*` ni a hooks de application directamente.
- `account/ui/*` y `transactions/ui/*` no deben depender de `shared/domain/corePort` (usar view models propios).
- Coordinacion entre capacidades hermanas se hace via `provided.events` del emisor y `required.config` del receptor
  (ejemplo: `TransactionEntryComponent.events.onRecorded` -> `MonthlyMovementsComponent.config.refreshSignal`).

## Mezcla de dominios y ACL

- La mezcla `ledger + taxonomy` para transacciones ocurre en:
  - `transactions/application/useTransactionEntryModel.ts`
  - `movements/application/useMonthlyMovementsModel.ts`
  - `movements/application/useMovementsSearchModel.ts`
- La mezcla de importacion (`movementsImportBackup` y `mobillsImport` legado) ocurre en `account/application/AccountPage.tsx` y `imports/*`.
- Los DTO del backend se traducen a view models en:
  - `account/application/accountViewMappers.ts` (cuentas)
  - `transactions/application/transactionViewMappers.ts` (transacciones)

## Runtime actual

Android es el unico runtime de producto activo. `app/src/shared/infrastructure/core/coreAdapter.ts`
redirige a `CorePlugin` cuando Capacitor corre en plataforma nativa. El adaptador web queda para pruebas
y futuro runtime web; iOS queda fuera de alcance por ahora.

## UX Transferencias FX

La logica UX de transferencias vive en:

- `transactions/application/useTransactionEntryModel.ts` (estado, reglas y submit)
- `transactions/ui/TransactionComposerView.tsx` (render y campos)

Comportamiento esperado:

- siempre: `Amount out` + `Destination account`.
- misma divisa: no se muestra `FX rate`; `Amount in` se mantiene 1:1.
- distinta divisa: se muestran `Amount in` y `FX rate` con 2 modos:
  - `Auto amount in`: editas `Amount out` + `FX rate`; `Amount in` se calcula.
  - `Auto FX rate`: editas `Amount out` + `Amount in`; `FX rate` se calcula.
- `More options` mantiene campos avanzados (date/note/tags; category cuando aplica).

Errores UX:

- validacion local por campo:
  - `transferAmountIn`: importe destino invalido
  - `transferFxRate`: cambio invalido (`<= 0`)
- errores de negocio del backend se propagan como error general de formulario (sin romper DDD en UI).

## Reglas de dependencia

- `shared/*` no depende de `account|ledger|taxonomy|imports`.
- `ui/*` no importa `application/use*`.
- `account/ui/*` y `transactions/ui/*` consumen contratos y view models, no tipos crudos de core.
