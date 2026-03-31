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
      useAccountPageModel.ts
      useToast.ts
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
        AccountsComponent.tsx
        AccountsComponent.contract.ts
        TransactionsImportComponent.tsx
        TransactionsImportComponent.contract.ts
      sections/
        StatusSection.tsx

  transactions/
    application/
      TransactionEntryComponent.tsx
      TransactionEntryComponent.contract.ts
      useTransactionEntryModel.ts
      RecentTransactionsComponent.tsx
      RecentTransactionsComponent.contract.ts
      useTransactionHistoryModel.ts
      transactionsCore.port.ts
      transactionViewMappers.ts
    domain/
      transactions.types.ts
      transactionView.types.ts
    infrastructure/
      transactionsGateway.ts
    ui/
      TransactionComposerView.tsx
      RecentTransactionsListView.tsx
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
    domain/*
    infrastructure/*
    ui/

  taxonomy/
    application/*
    domain/*
    infrastructure/*

  shared/
    domain/
      corePort.ts
    infrastructure/
      core/*
    ui/
      transactions/components/*
    testing/
      setup.ts
    utils/
      formatting.ts
```

## Responsabilidades

- `App.tsx`: bootstrap y routing.
- `account/application/AccountPage.tsx`: composicion cross-capability.
- `account/ui/capabilities/*`: capacidades de cuenta e importacion de alto nivel.
- `transactions/*`: capacidad transaccional completa y autonoma (entry + recent activity + UI + mappers).
- `imports/*`: capacidad de importacion como caja negra reutilizable.
- `ledger/*` y `taxonomy/*`: acceso y reglas de backend; no definen la UX por si mismos.
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
  (ejemplo: `TransactionEntryComponent.events.onRecorded` -> `RecentTransactionsComponent.config.refreshSignal`).

## Mezcla de dominios y ACL

- La mezcla `ledger + taxonomy` para transacciones ocurre en:
  - `transactions/application/useTransactionEntryModel.ts`
  - `transactions/application/useTransactionHistoryModel.ts`
- La mezcla de importacion (`mobillsImport`) ocurre en `account/application/useAccountPageModel.ts`.
- Los DTO del backend se traducen a view models en:
  - `account/application/accountViewMappers.ts` (cuentas)
  - `transactions/application/transactionViewMappers.ts` (transacciones)

## Reglas de dependencia

- `shared/*` no depende de `account|ledger|taxonomy|imports`.
- `ui/*` no importa `application/use*`.
- `account/ui/*` y `transactions/ui/*` consumen contratos y view models, no tipos crudos de core.
