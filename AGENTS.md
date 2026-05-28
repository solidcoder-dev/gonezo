# Codex Project Guidance

For Excel import/upsert logic in this repository:

- Treat stable row IDs as the primary identity whenever they are present.
- Do not match an incoming row by natural key before checking its stable ID.
- Preserve the Excel-provided `soft_delete` value exactly; never default an existing soft-deleted row back to active during import.
- Add or update a regression test covering an existing soft-deleted Excel row re-imported with the same stable ID.
