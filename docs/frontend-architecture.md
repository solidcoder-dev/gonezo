# Frontend Architecture

## Objetivo

Separar frontend por dominios y capas, manteniendo la mezcla de dominios solo en el modulo de composicion (`account`).

## Estructura deseada

```text
app/src/
  ledger/
    application/
      useLedgerAccounts.ts
      useLedgerTransactions.ts
      useLedgerTransactionCommands.ts
    domain/
      ledger.types.ts
      ledger.rules.ts
    infrastructure/
      ledgerGateway.ts
      ledgerMappers.ts
    ui/
      LedgerAccountSwitcherView.tsx
      LedgerSummaryCard.tsx
      LedgerTransactionsListView.tsx

  taxonomy/
    application/
      useCategorySuggestions.ts
      useTagSuggestions.ts
      useTransactionClassification.ts
    domain/
      taxonomy.types.ts
      taxonomy.rules.ts
    infrastructure/
      taxonomyGateway.ts
      taxonomyMappers.ts
    ui/
      CategoryComboboxField.tsx
      TagComboboxField.tsx

  imports/
    mobills/
      application/
        useMobillsImport.ts
      domain/
        mobillsImport.types.ts
        mobillsImportPolicy.ts
      infrastructure/
        mobillsFileReader.ts
        mobillsParser.ts
        mobillsImportGateway.ts
      ui/
        MobillsImportSheetView.tsx
        MobillsImportSummaryView.tsx

  account/
    application/
      useAccountPageOrchestrator.ts
      useAccountCommands.ts
      useTransactionSubmitFlow.ts
      useManageAccountFlow.ts
      useToast.ts
    domain/
      accountPage.types.ts
      accountPage.vm.ts
    infrastructure/
      accountUiPolicies.ts
    ui/
      AccountPageView.tsx
      TransactionComposerView.tsx
      ExpenseSplitEditor.tsx
      TransferTargetSelect.tsx
      ManageAccountSheetView.tsx
      ImportSheetView.tsx
      ImportResultSummary.tsx
      ToastBanner.tsx
      ErrorBanner.tsx

  shared/
    ui/
      ModalSheet.tsx
      ConfirmDialog.tsx
      LoadingState.tsx
    application/
      useAsyncAction.ts
    utils/
      date.ts
      formatting.ts
    types/
      ui.ts

  app/
    App.tsx
    Accounts.tsx
```

## Responsabilidades por modulo

- `ledger`: dinero y hechos financieros.
- `taxonomy`: clasificacion (categorias y tags).
- `imports/mobills`: adaptacion e importacion de archivo externo.
- `account`: composicion cross-domain para la experiencia de cuentas.
- `shared`: piezas reutilizables y neutrales.

## Convenciones de hooks

- `useAccountPageOrchestrator` es el unico hook de orquestacion global de pantalla.
- Los demas hooks exponen contrato estable `{ state, actions }`.
- Hooks de dominio no deben llamar hooks de otro dominio.

## Convenciones de UI

- Componentes `ui/*` son dumb: reciben datos por props y emiten eventos.
- Ningun componente visual llama a `core.*` directamente.
- La mezcla `ledger + taxonomy + imports` ocurre en `account/application`.

## Reglas de dependencia

- `ledger/*` no depende de `taxonomy/*` ni de `imports/*`.
- `taxonomy/*` no depende de `ledger/*`.
- `imports/mobills/*` puede depender de `ledger` y `taxonomy` via puertos de aplicacion.
- `account/*` puede componer `ledger`, `taxonomy` e `imports/mobills`.
- `shared/*` no depende de modulos de dominio.
