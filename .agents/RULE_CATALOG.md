# Gonezo Rule Catalog

This catalog preserves the earlier complete skill list as grouped rules. Codex should load the broad skill pack rather than trying to load each rule as a separate skill.

## Structure and architecture

project-structure-contract, architecture-tests, strict-ddd, bounded-contexts, ports-and-adapters, hexagonal-architecture, application-services, commands-and-queries, read-query-no-mutation, solid, dependency-direction, anti-corruption-layer, domain-events, aggregate-boundaries, value-objects, invariant-protection, explicit-use-cases, orchestration-not-domain, domain-vs-read-model, shared-kernel-discipline, consistency-boundary, module-boundary-rules, import-boundary-rules, folder-ownership, no-new-top-level-folders, active-vs-transitional-folders, structure-check-before-edit, repo-migration-status.

## Frontend

required-provided-interfaces, capability-contracts, dumb-smart-components, page-as-composition-root, frontend-application-layer, ui-no-core-access, view-model-boundaries, component-api-design, state-ownership, form-state-patterns, cross-capability-events, refresh-signal-pattern, route-state-discipline, graceful-degradation-frontend, loading-empty-error-states, optimistic-ui, accessibility-first-ui, mobile-first-ui, design-system-discipline, progressive-disclosure, ui-copy-quality, error-boundaries, toast-and-feedback-rules, faceted-search-scope, analytics-read-models.

## Native and adapter contracts

capacitor-boundaries, native-bridge-contracts, core-plugin-surface, plugin-handler-splitting, typescript-java-dto-parity, native-web-adapter-parity, bridge-error-mapping, platform-capability-detection, android-runtime-scope, sqlite-adapter-discipline, transaction-consistency-boundary, plugin-performance-rules, web-fake-runtime-rules, in-memory-state-discipline, fake-dependencies, contract-tests-for-adapters, web-runtime-not-production.

## Financial and scheduling domain

money-rules, currency-and-money-contracts, fx-transfer-rules, split-amount-rules, ledger-domain-rules, taxonomy-domain-rules, expected-vs-scheduled-vs-posted, recurrence-rules, recurrence-projection-rules, one-shot-vs-recurring, date-time-rules, date-time-zone-discipline, status-lifecycle-rules, archive-vs-delete, master-data-ownership.

## Import, backup, migration

import-pipeline, import-idempotency, stable-row-id-first, soft-delete-preservation, legacy-import-isolation, backup-schema-versioning, per-row-import-results, import-policy-normalization, partial-failure-rules, migration-contracts, external-file-parsing, import-preview-before-commit, bootstrap-seeding, excel-import-upsert-rules.

## Testing and code quality

testing-pyramid, domain-unit-tests, application-service-tests, frontend-component-tests, contract-tests, native-plugin-tests, adapter-contract-tests, regression-tests, regression-test-per-bug, test-data-builders, property-based-tests, money-property-tests, recurrence-property-tests, golden-file-tests, boundary-rule-tests, architecture-checks-as-ci, self-explanatory-code, pragmatic-fowler-style, small-files-small-functions, no-god-objects, contract-interface-segregation, adapter-method-budget, naming-rules, explicit-types, null-safety, side-effect-isolation, defensive-boundaries, domain-error-codes, duplication-rules, refactoring-discipline, complexity-budget, dependency-hygiene, performance-basics, security-basics, logging-rules.

## Documentation and agent behavior

docs-as-contract, architecture-decision-records, current-vs-planned-docs, current-vs-future-architecture, root-readme-quality, root-readme-as-entrypoint, feature-readmes, agent-instructions, changelog-discipline, generated-files-hygiene, pull-request-checklist, code-review-architecture, code-review-frontend, code-review-domain, code-review-tests, ci-quality-gates, repo-first-analysis, minimal-change-policy, ask-only-when-blocked, patch-with-explanation, do-not-break-boundaries, no-placeholder-code, consistency-over-preference, safe-large-refactors, failure-transparency, agent-scope-control, minimal-diff-refactoring.
