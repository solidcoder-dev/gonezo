# Amount visibility

## Contract

Amount visibility is a local presentation preference with two values: `visible` and `hidden`.

- **Visible**: financial amounts use the existing formatted presentation.
- **Hidden**: every non-editable financial amount is represented by exactly `••••••`.
- **Hide amounts** / **Show amounts**: the header actions that change the preference.
- **Masked amount**: the neutral hidden representation, without a sign or financial color.

The first installation defaults to `visible`. While the preference is loading, invalid, or unavailable to read, the effective presentation is hidden. The application domain and backend continue to return and use real values. The preference is stored locally on the device and is not part of financial backup data.

## Reachable surfaces

The workspace routes are `/`, `/home`, `/accounts`, `/analytics`, `/movements`, `/movements/new`, `/movements/search`, and `/profile`. The workspace shell also reaches the following secondary surfaces:

- Home: `NetWorthSummaryComponent` and its currency trend, `PendingExpectedOverviewComponent`, `HomeRecentMovementsComponent`, account summary, accounts rail, currency accounts sheet, account management sheet, and `HomeMovementListView`.
- Accounts: account balances, account selector/rail, account summary, account sheets, and account management flows.
- Movements: monthly posted/expected/scheduled sections, `MovementRowView`, section totals and `MovementSummaryTileView`, search results and filters, reuse suggestions and confirmation, movement details, item breakdowns, and sharing details.
- Analytics: Overview, Spending, and Flow reached through `AnalyticsPageComponent`, including summary cards, category rows, top expenses, projections, timelines, cash-flow charts, flow insights, chart labels, tooltips, and accessible chart content.
- Workspace header: the visibility action is placed between the optional search action and notifications.

The inventory includes calls to `formatCurrencyAmount`, local amount formatters, separately rendered signs, amount strings in accessible labels and titles, and numeric chart data. Titles, categories, tags, accounts, currencies, dates, units, participants, and counters are not financial amounts and remain visible. Free text such as movement titles and notes is not inspected for money.

## Exceptions

Active creation and editing forms keep the amount field/calculator, item prices and totals, sharing quantities and totals, transfer values needed for review, and submission confirmation amounts visible. This exception ends when the form closes; historical previews and account balances remain masked. Reuse metadata and confirmation hide historical amounts, with the confirmation copy: `Reusing details will replace the current amount.` Confirming reuse copies the real amount into the editable form.

Import/export and backup retain their existing behavior and real financial data. Amount visibility is never exported or imported with financial data.

## Implementation status

The implemented coverage is:

- Local preference contract, safe startup state, invalid/failing storage handling, and persistence independent of backup data.
- Shared workspace state above the routes and the header eye action, including loading/saving locking and one-shot feedback notices.
- Home net worth, pending expected totals, recent movements, account balances, account rails, and currency account sheets.
- Posted, expected, and scheduled movement lists; grouped and paginated search results; movement row signs and accessible labels.
- Movement detail amount, sharing totals/participants, item prices/subtotals, and the detail sheet presentation.
- Editing forms remain editable and visible. Historical reuse confirmation does not reveal the previous amount and uses the required neutral wording.
- Analytics filters remain usable while financial reports and charts are replaced by `Amounts hidden`; reports are not mounted while hidden.

The remaining `formatCurrencyAmount` calls are in domain/application presenters, calculations, export/import paths, or active editing forms. They retain real values and are not themselves rendering surfaces; no global formatter change is used.
