# GIS Practice Hub - working rules

- Colours: use only the AECOM colour system defined in `src/app/globals.css` and documented in
  `docs/brand.md` (Earth Green primary, with the palette tints). Never add raw hex values to
  components; add or reuse a token. Sheet colours of the workbook map to the same tokens.
- Typography: Arial. No logo in the app: the wordmark "GIS Practice | GIS Hub".
- Punctuation: never use a long dash anywhere (code, docs, UI text, commits); use "-" only.
- Data: client and project data stays on AECOM systems; the Render demo holds only sample data.
  No passwords or secrets in files.
- Architecture: keep the domain / application / infrastructure boundaries enforced by ESLint.
- The workbook is the specification: every register keeps the sheet's columns, names and
  automations (`docs/workbook-mapping.md`). Dates use the browser date picker everywhere.
