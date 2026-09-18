# Macro Analytics contribution consent

`AnalyticsProfile` stores demographic context. `AnalyticsContributionConsent` stores the user's separate permission to contribute to future Macro Analytics processing. The current notice is version 1; it is independent of `MACRO_ANALYTICS_SCHEMA_VERSION`.

Only a consent with status `GRANTED` is eligible for future contribution. `DECLINED` and `WITHDRAWN` are not eligible. Users can change their choice from Profile → Privacy & Analytics, and either onboarding choice allows normal Gonezo use.

Stage 3 stores the decision locally using Android Keystore backed AES-GCM storage on Android and the existing in-memory adapter for development/runtime tests. It does not send data, create contribution payloads, or publish statistics.

Withdrawal only ends future contribution eligibility. Handling or deleting contributions that may have been published earlier is deferred to a future backend stage; Stage 3 has no remote deletion workflow.

## Local contribution building

Stage 4 builds a local, monthly `MacroAnalyticsContribution` only after granted consent and an available demographic profile. The contribution includes the period, schema version, cohort dimensions, and sparse financial totals grouped by currency, source, and kind. It excludes user and movement identifiers, timestamps, raw birth year, and transaction details. No contribution is stored remotely or uploaded.

V1 age bands use `contribution period year - birthYear` as an approximate age. This is a birth-year-based cohort, not an exact birthday-derived age. Financial totals use exact decimal-string addition and remain separate by currency, `POSTED`/`EXPECTED`/`SCHEDULED` source, and `INCOME`/`EXPENSE`/`TRANSFER_IN`/`TRANSFER_OUT` kind. An absent bucket means zero; an eligible period with no financial facts is still a valid contribution.
