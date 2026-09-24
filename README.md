# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Local reading library

Use the heart button on the home page, search results, or manga details to save a title. `/library` lists saved titles and offers JSON backup export/import. No account, MangaDex token, or separate backend is required.

Data is stored under `mgx-library-v1` in this site's browser localStorage. It persists across reloads and updates other tabs on the same origin, but does not sync across devices. Clearing site data removes it. Import merges saved titles by MangaDex ID and keeps the newer reading position; invalid files leave existing data unchanged. Limits: 2,000 saved titles and a 2 MB backup.

The reader remembers the last chapter only after a page image loads successfully. Unavailable chapters and failed page requests do not advance the reading position. Saved titles expose a continue-reading link; removing a saved title keeps its reading position.

Run `npm test` with Node.js 24 (or a Node version supporting `--experimental-strip-types`) for storage, merge, validation, and quota-failure checks. Run `npm run build` and `npm run lint` for app checks.
