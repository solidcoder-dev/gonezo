# Macro Analytics contribution consent

`AnalyticsProfile` stores demographic context. `AnalyticsContributionConsent` stores the user's separate permission to contribute to future Macro Analytics processing. The current notice is version 1; it is independent of `MACRO_ANALYTICS_SCHEMA_VERSION`.

Only a consent with status `GRANTED` is eligible for future contribution. `DECLINED` and `WITHDRAWN` are not eligible. Users can change their choice from Profile → Privacy & Analytics, and either onboarding choice allows normal Gonezo use.

Stage 3 stores the decision locally using Android Keystore backed AES-GCM storage on Android and the existing in-memory adapter for development/runtime tests. It does not send data, create contribution payloads, or publish statistics.

Withdrawal only ends future contribution eligibility. Handling or deleting contributions that may have been published earlier is deferred to a future backend stage; Stage 3 has no remote deletion workflow.

## Local contribution building

Stage 4 builds a local, monthly `MacroAnalyticsContribution` only after granted consent and an available demographic profile. The contribution includes the period, schema version, cohort dimensions, and sparse financial totals grouped by currency, source, and kind. It excludes user and movement identifiers, timestamps, raw birth year, and transaction details. No contribution is stored remotely or uploaded.

V1 age bands use `contribution period year - birthYear` as an approximate age. This is a birth-year-based cohort, not an exact birthday-derived age. Financial totals use exact decimal-string addition and remain separate by currency, `POSTED`/`EXPECTED`/`SCHEDULED` source, and `INCOME`/`EXPENSE`/`TRANSFER_IN`/`TRANSFER_OUT` kind. An absent bucket means zero; an eligible period with no financial facts is still a valid contribution.

## Publication protocol and ingestion boundary

The client maps a domain publication through an explicit V1 wire serializer. The shared schema and fixtures live in `contracts/macro-analytics`. The wire period is `YYYY-MM`; the protocol does not contain a Gonezo user ID or movement-level facts.

The standalone Kotlin ingestion module validates V1 publications and retains only the latest value for each contributor ID and month. Repeated equal revisions are idempotent, higher revisions replace older ones, lower revisions are stale, and a same-revision payload mismatch is a conflict. Its current repository is in-memory.

## Local-first persistence and processing

The Android structured Macro Analytics state is stored in the existing `gonezo.db` database (schema version 40): contributor identity, pending publications, latest locally processed publications, queued contribution rebuild periods, and backfill state have separate tables. Full-rebuild requests carry a persisted generation so a newer request cannot be cleared by maintenance work that discovered an earlier request. Contributor identity is preserved during a full portable-state reset; pending publications, latest derived publications, queued periods, and backfill state are cleared so they can be rebuilt from the restored financial state. Consent withdrawal continues to clear pending publications and also clears queued rebuild periods.

The local flow is:

```text
Operational data → FinancialFact → MacroAnalyticsContribution → MacroAnalyticsPublication
  → SQLite outbox → MacroAnalyticsPublicationProcessorPort
  → local processor → SQLite latest publication
```

The Core composition boundary marks exact periods for posted facts when their effective date is available. Changes that may move or alter historical facts request a full rebuild, while schedule and recurrence changes enqueue only the current period. The Analytics movement-fact source discovers historical periods for initial backfill and full rebuilds, bounded through the current month. Startup, app resume, consent grant, profile save, and persisted financial changes trigger one serialized local maintenance runner. Failed or conflicting work remains queued for retry; unchanged contributions reuse the latest publication revision.

The P-256 signing private key remains in Android Keystore. The old encrypted SharedPreferences entry is read only for a one-way, per-user migration into SQLite; it is deleted only after the migrated state is persisted and verified. Its AES key remains available for legacy entries. Local publication processing uses the same revision outcomes as ingestion: accepted, updated, already current, stale, or revision conflict. A conflict remains pending for diagnosis.

The application depends on `MacroAnalyticsPublicationProcessorPort`, so a future remote processor can serialize and sign the same domain publication, send it to a server, and translate its acknowledgement without changing contribution building or publication preparation. This task adds no remote transport or server synchronization.

## Contributor identity and publication signatures

Stage 7 keeps the publication V1 schema unchanged and wraps its exact compact UTF-8 wire bytes in a signed transport model. Each contributor uses an EC P-256 key pair with SHA256withECDSA. Android creates a signing-only private key in Android Keystore; application code receives only the public SubjectPublicKeyInfo DER bytes (base64url without padding), a key ID, and signatures (base64url without padding). The key ID is base64url without padding of SHA-256 over the SPKI DER bytes.

Credential registration proves possession by signing exactly `gonezo-macro-analytics-credential-v1\n<contributorId>\n<keyId>` as UTF-8, with no final newline. The server verifies this proof before binding a contributor to one public key. An exact valid repeat is idempotent; a different key conflicts and cannot replace the registered key.

The security roles are separate: `ContributorId` is a pseudonymous analytical identity; the P-256 private key proves control of that identity; the ECDSA signature protects publication integrity and authenticity; publication revision handles freshness and idempotency; future TLS will provide transport confidentiality. Stage 7 has no HTTP listener or remote endpoint, PostgreSQL store, or macro aggregation.

Proof of possession only establishes that a sender controls a key. It does not prove that the sender is a unique legitimate Gonezo installation or user. Stage 7 therefore does not prevent fake clients, mass contributor creation, bots, or Sybil attacks. App/device attestation and an anti-abuse decision are deferred until before public exposure. Existing local Gonezo authentication does not make the contributor ID a credential.
