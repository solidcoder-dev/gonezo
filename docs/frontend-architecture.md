# Frontend Architecture

## Objetivo

Separar frontend por dominios y capas, manteniendo la mezcla de dominios solo en el modulo de composicion (`account`).

## Estructura deseada

```text
app/src/
  App.tsx
  App.css
  main.tsx
  index.css

  ledger/
    application/
      useLedgerAccounts.ts
      useLedgerAccountWorkspace.ts
      useLedgerComposerWorkspace.ts
      useLedgerTransactionsWorkspace.ts
      useLedgerTransactions.ts
      useLedgerTransactionCommands.ts
    domain/
      ledger.types.ts
      ledger.rules.ts
    infrastructure/
      ledgerGateway.ts
    ui/

  taxonomy/
    application/
      useCategorySuggestions.ts
      useTaxonomyComposerWorkspace.ts
      useTagSuggestions.ts
      useTransactionClassification.ts
    domain/
      taxonomy.types.ts
      taxonomy.rules.ts
    infrastructure/
      taxonomyGateway.ts
    ui/
      CategoryComboboxField.tsx
      TagComboboxField.tsx

  imports/
    application/
      useTransactionsImportController.ts
      TransactionsImportComponent.tsx
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

  account/
    application/
      AccountPage.tsx
      useAccountPageModel.ts
      useToast.ts
    domain/
      accountPage.types.ts
    infrastructure/
      App.spec.tsx
    ui/
      AccountPageView.tsx
      accountPageView.contract.ts
      AccountSwitcherView.tsx
      sections/*
      transactions/
        TransactionComposerView.tsx
        RecentTransactionsListView.tsx

  shared/
    domain/
      corePort.ts
    infrastructure/
      core/
        coreAdapter.ts
        coreAdapterWeb.ts
        corePlugin.ts
        corePluginWeb.ts
    ui/
      transactions/
        components/*
    testing/
      setup.ts
    utils/
      formatting.ts
```

## Responsabilidades por modulo

- `ledger`: dinero y hechos financieros.
- `taxonomy`: clasificacion (categorias y tags).
- `imports`: adaptacion e importacion de archivos externos.
- `account`: composicion cross-domain para la experiencia de cuentas.
- `shared`: piezas reutilizables y neutrales.

## Convenciones de hooks

- `AccountPage.tsx` es el unico punto de composicion/orquestacion global de pantalla.
- Los hooks por dominio (`ledger`, `taxonomy`, `imports`) exponen contratos `{ state, actions }`.
- Hooks de dominio no deben llamar hooks de otro dominio.

## Convenciones de UI

- `AccountPageView` recibe contratos `required` y `provided` agrupados por feature (`account`, `transactions`, `composer`, `imports`, `toast`).
- Componentes de seccion y componentes reutilizables siguen el mismo patron: tipos `*Required` y `*Provided` cuando corresponda.
- Carga y errores se modelan por feature (`loadPhase`/`submitPhase`) y solo se eleva un estado global cuando bloquea la pantalla.
- Componentes `ui/*` son dumb: reciben un contrato explicito de props y emiten eventos.
- Ningun componente visual llama a `core.*` directamente.
- La mezcla `ledger + taxonomy + imports` ocurre en `account/application`.

## Reglas de dependencia

- `ledger/*` no depende de `taxonomy/*` ni de `imports/*`.
- `taxonomy/*` no depende de `ledger/*`.
- `imports/*` puede depender de `ledger` y `taxonomy` via puertos de aplicacion.
- `account/*` puede componer `ledger`, `taxonomy` e `imports`.
- `shared/*` no depende de modulos de dominio.
