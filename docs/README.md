# Docs

Current implementation priority is Android. The React UI is still shared, but production runtime work should assume the Android Capacitor shell and native `CorePlugin` bridge. Web and iOS are future targets and should stay untouched unless explicitly requested.

- `ledger-domain.md`: especificacion canónica del bounded context Ledger.
- `taxonomy-domain.md`: especificacion canónica del bounded context Taxonomy (categorias + tags).
- `ledger-taxonomy-workflow.md`: orquestacion tecnica entre Ledger y Taxonomy (categorizacion + tagging).
- `user-preferences.md`: preferencias locales del usuario como bounded context independiente.
- `movements-backup-import.md`: importacion principal de backups Gonezo como orquestacion multi-dominio.
- `mobills-import.md`: importacion Mobills legado como orquestacion multi-dominio.
- `frontend-architecture.md`: estructura frontend por dominios/capas (`ledger`, `taxonomy`, `imports`, `account`, `shared`).
