# UI feedback

## Baseline

The reviewed commit was `7cd23805fcad01945c8da73adb5bfae1acc218da`. The local
checkout used for this inventory is `2ec08679179fb7ccca5b5e7b6525e232d0b82d20`,
which is clean and contains changes after the reviewed commit. The inventory
below describes the local source because it is the tree that will be changed.

CodeGraph was not available in the agent toolset, so the inventory was checked
against the source with repository search and nearby component inspection.

## Current presentation rules

- Field validation stays beside the field through `gz-field-error` and the
  relevant `aria-describedby` relationship.
- Read failures stay in the affected section or sheet, including account
  loading, net worth, expected movements, recent movements, analytics,
  taxonomy, imports, and movement reuse.
- Workspace-level operation feedback is represented by one `useWorkspaceToast`
  coordinator and one `FeedbackNoticePresenter`; `StatusSection` retains only
  independent screen-load failures.
- Monthly movements publishes operation notices through its provided events.
  Its action is the existing delayed void cancellation (`Undo`). The
  five-second timer belongs to `useMonthlyMovementMutationsModel`, not to
  notice presentation.
- No operation feedback is persisted. No Android notification is part of this
  feature.

## Producer inventory

| Producer and operation | Kind | Current presentation | Existing action and lifecycle owner |
| --- | --- | --- | --- |
| `workspace/application/useWorkspaceToast.ts`: workspace operation results and errors | success, info, warning, error | `shared/ui/FeedbackNotice/FeedbackNoticePresenter.tsx`, rooted at the workspace or active sheet/dialog destination | `Download ZIP` and other provided actions are owned by the emitting capability; dismiss/action commands are owned by the workspace notice hook |
| `transactions/application/useTransactionEntryModel.ts`: account/taxonomy load and transaction submission | load failure, field validation, operation error | load/operation error in `TransactionEntryComponent`; field validation in composer fields | retry/correction remains with the composer; `onRecorded` and `onError` are provided by `TransactionEntryComponent`/`WorkspacePage` |
| `transactions/application/useTransactionMovementReuseModel.ts`: reuse lookup | read failure | movement reuse status inside the composer | correction/retry is local to reuse controls; no global action today |
| `movements/application/useMonthlyMovementMutationsModel.ts`: void, scheduled deactivation, expected dismissal, expected posting | operation result, error, delayed undo | workspace notice through `useMonthlyMovementsFeedbackModel`; read failures remain in the movements section | `Undo` and its five-second timer are owned by the mutation model; the producer clears the action when committing or unmounting |
| `movements/application/useMovementsSearchModel.ts` and search query runners | read failure and movement actions | search results/filter section status | retry/query controls remain with the search capability; navigation/post/edit/duplicate commands are provided by `WorkspacePage` |
| `account/application/AccountHub/*`, `AccountSummary/*`, `AccountsRail/*`, `CurrencyAccountsSheet/*`, `ManageAccountSheet/*` | account loading and account mutations | local section/sheet errors; some mutations also emit `onError` | account selection, retry, close, and mutation completion remain with each capability and are composed by `WorkspacePage` |
| `analytics/application/AnalyticsPageComponent.tsx` and analytics models | analytics read failure | analytics section status | filter/navigation controls remain with analytics; `onError` is emitted through the capability boundary |
| `imports/application/useTransactionsImportController.ts` and `TransactionsImportView` | import validation, row/transport failure, partial result | import section status and summary | file selection and submit are owned by import; completion/failure callbacks are connected by the workspace |
| `imports/application/ApplicationBackupRestoreComponent.tsx` | restore validation, restore failure, completion | restore sheet inline alert/status | close and restore are owned by the restore sheet; the workspace owns refresh after completion |
| `core/application/interpretation/*`, `transactions/application/MovementVoiceEntry*`, and voice dock components | voice warning/error and diagnostics result | workspace toast through `provided.events`; `Download ZIP` may be offered | voice producer creates the diagnostic export action; workspace owns toast presentation and invocation |
| `account/application/AccountHub/*`, `NetWorthSummaryComponent`, `PendingExpectedOverviewComponent`, `HomeRecentMovementsComponent` | home/profile read failure | affected section status/alert | section retry or navigation remains with the capability; error event wiring is composed by `WorkspacePage` |
| taxonomy and sharing adapters | backend failures surfaced by their callers | caller-specific form or section status | caller owns correction/retry; adapters do not present feedback |

## Terms to preserve during migration

`screen.error`, field errors, read failure state, operation feedback, action
ownership, and delayed mutation lifecycle are separate concerns. A notice
timer must never schedule, pause, extend, or otherwise own the five-second
void-commit timer.

The baseline portion of this document is an inventory and migration scope;
the policy below records the presentation behavior introduced during the
migration.

## Notice queue policy

The workspace presenter has one visible notice and up to four pending notices.
Pending notices are FIFO. Repetition is grouped only when the producer gives
the same explicit deduplication key; the existing notice and its first action
are retained while its counter increases. Equal text from different producers
without that key remains separate.

When pending capacity is full, the oldest pending transient notice without an
action is discarded first. If every pending notice is persistent, the excess
is represented by a saturation notice with a counter and the message
`Some feedback was not shown.`. The queue is presentation state, not a
history, and the saturation notice does not claim that discarded diagnostics
were preserved.
