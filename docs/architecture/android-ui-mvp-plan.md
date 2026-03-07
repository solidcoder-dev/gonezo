# Android UI MVP Plan

## Current baseline

- Current UI has `Home` and `Debug` screens.
- Business actions exist behind debug buttons.
- No task-focused mobile IA yet (accounts/transactions/budget/investments user journeys are not surfaced as product screens).

## Step 1: MVP flows (priority + success criteria)

### Flow A: Create Account (P0)

Success criteria:
- User can enter `name`, optional `type`, `currency`.
- Validation blocks empty name.
- Submit shows loading state and success feedback with created ID.
- New account appears in account list (or confirmation card if list is deferred).

### Flow B: Post Expense (P0)

Success criteria:
- User can choose account, date, amount, category, merchant.
- Invalid amount/date blocked inline.
- Submit triggers `postExpense` and confirms transaction created.
- Balances view reflects updated values after action.

### Flow C: View Budget Status (P0)

Success criteria:
- User can open current period snapshot.
- User sees category balances and reservations.
- Empty/loading/error states are explicit and actionable.

### Flow D: Post Transfer (P1)

Success criteria:
- User can transfer between two accounts with amount/date.
- Prevent same source and destination account.
- Confirmation includes both generated transaction IDs.

### Flow E: Post Income (P1)

Success criteria:
- User can post income for plan/account.
- Form defaults date/currency.
- Budget period totals are refreshed after success.

## Step 2: Information architecture + navigation

Navigation model for Android MVP:
- Bottom tabs (primary): `Dashboard`, `Transactions`, `Budget`, `Accounts`.
- Stack detail screens under each tab.

Suggested route map:
- `/dashboard`
- `/transactions`
- `/transactions/expense/new`
- `/transactions/transfer/new`
- `/transactions/income/new`
- `/budget`
- `/budget/period/:periodId`
- `/accounts`
- `/accounts/new`
- `/debug` (internal only)

Screen responsibilities:
- Dashboard: quick KPIs and shortcuts to key actions.
- Transactions: action hub for Expense/Transfer/Income creation.
- Budget: period summary, balances, reservations.
- Accounts: list + create account flow.

## UX/UI best-practice checklist for implementation

- Form UX:
  - Inline field validation and clear error text.
  - One primary CTA per screen.
  - Disabled submit while invalid or submitting.
- Feedback:
  - Toast/banner on success and failure.
  - Retry action for recoverable failures.
- Accessibility:
  - Touch targets >= 44dp.
  - Labeled inputs/buttons.
  - Visible focus states.
- Mobile ergonomics:
  - Sticky primary CTA on long forms.
  - Correct keyboard type for money/date fields.
  - Safe-area friendly spacing.

## Component backlog (build reusable first)

P0 components:
- `ScreenScaffold` (title, content, optional footer CTA)
- `BottomTabNav`
- `PrimaryButton`, `SecondaryButton`
- `TextField`, `SelectField`, `DateField`, `AmountField`
- `StatusBanner` (success/error/info)
- `LoadingBlock`, `EmptyState`, `ErrorState`
- `ResultCard` (IDs/outcomes)

P1 components:
- `SectionCard`
- `AccountPicker`
- `CategoryPicker`
- `BalanceList`
- `ReservationList`

## Iterative delivery sequence (red/green)

1. Introduce navigation shell + tabs + placeholders.
2. Implement Accounts list + Create Account screen.
3. Implement Post Expense screen.
4. Implement Budget summary screen (balances + reservations).
5. Add Transfer and Income screens.
6. Keep `Debug` route hidden behind a dev-only entry.

Validation at each iteration:
- `cd app && npm run build`
- `cd core && ./gradlew checkLayerBoundaries test`
- `cd app/android && ./gradlew :infrastructure:test :app:assembleDebug`
- Emulator smoke: execute the target flow end-to-end.

## Definition of done for Android UI MVP

- P0 flows completed with validation, loading, and error handling.
- No flow depends on `Debug` screen controls.
- Navigation is task-oriented and consistent.
- Core build, Android assemble, and smoke checklist all pass.
