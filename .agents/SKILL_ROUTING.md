# Gonezo Skill Routing

Use this file as a deterministic router when Codex does not automatically select the right skill.

| Task or path | Required skills |
|---|---|
| Any code edit | project-structure-contract, self-explanatory-code, pragmatic-refactoring, testing-strategy |
| `app/src/**` | frontend-architecture, required-provided-capabilities |
| `app/src/core/**` | native-bridge-contracts, adapter-contracts, android-runtime-boundaries |
| `app/src/**/ui/**` | frontend-architecture, required-provided-capabilities, self-explanatory-code |
| `app/src/**/application/**` | frontend-architecture, required-provided-capabilities, ports-and-adapters |
| `app/src/**/infrastructure/**` | ports-and-adapters, adapter-contracts |
| `app/scripts/**` | architecture-tests, repo-hygiene |
| `core/src/main/**/domain/**` | strict-ddd, financial-domain-rules or scheduling-expected-posted-rules when relevant |
| `core/src/main/**/application/**` | strict-ddd, ports-and-adapters |
| `core/src/main/**/infrastructure/**` | ports-and-adapters, architecture-tests |
| `platforms/android/**` | native-bridge-contracts, android-runtime-boundaries, adapter-contracts |
| `app/android/**` | native-bridge-contracts, android-runtime-boundaries, adapter-contracts |
| `**/backup/**`, `**/import/**`, `**/mobills/**`, `**/*.csv`, `**/*.tsv`, `**/*.json` import/export logic | import-backup-migration-rules |
| Money, accounts, transfers, categories, tags, splits, balances, analytics | financial-domain-rules |
| Recurrence, expected, scheduled, due processing, posting, local dates, zone IDs | scheduling-expected-posted-rules |
| Tests | testing-strategy plus the domain skill for the behavior tested |
| Structural change | project-structure-contract, architecture-tests, repo-hygiene |

When in doubt, apply fewer broad skills deeply rather than many tiny skills superficially.
