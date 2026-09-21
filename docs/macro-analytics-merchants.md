# Macro Analytics merchant classification

Macro Analytics resolves the local `AnalyticsMerchantReference.key` only against the explicit alias catalog in `app/src/macroAnalytics/infrastructure/canonicalMerchantCatalog.ts`. Catalog aliases must already use the local analytical normalization. Matching is exact; an unknown key remains unresolved and becomes the reserved `UNMAPPED` code when a merchant fact is created.

`MACRO_MERCHANT_CATALOG_VERSION` identifies the classification catalog. Changing it changes historical classification and must trigger a full macro rebuild/backfill in the release that changes it. Catalog versioning is independent of the contribution schema version.
