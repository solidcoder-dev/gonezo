# Macro Analytics merchant classification

Macro Analytics resolves the local `AnalyticsMerchantReference.key` only against the explicit alias catalog in `app/src/macroAnalytics/infrastructure/canonicalMerchantCatalog.ts`. Catalog aliases must already use the local analytical normalization. Matching is exact; an unknown key remains unresolved and becomes the reserved `UNMAPPED` code when a merchant fact is created.

`MACRO_MERCHANT_CATALOG_VERSION` identifies the classification catalog. Increasing it changes historical merchant classification and requires a future full Macro Analytics rebuild. This stage does not implement that rebuild or change Contribution V4, Publication V4, or backfill version 4.
