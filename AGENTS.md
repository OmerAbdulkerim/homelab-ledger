# Homelab Ledger

## Project
Homelab Ledger helps me track my servers, self-hosted apps, deployments and
maintenance. Admins manage all records, while regular users view inventory and
work on tasks. Server monitoring is outside the current scope but may be added
in the future. The app will never deploy applications automatically.

## Stack and architecture
The frontend uses HTML, CSS and JavaScript as a SPA. The backend will use PHP
with FlightPHP, MySQL and PDO. Routes receive requests, services handle the
rules, and DAOs query the database. M1 uses sample data for now.

- Only backend services call DAOs. Use PDO prepared statements for queries.
- Each of the five entities gets a service and DAO; share a reusable base DAO.
- Frontend views render content, controllers coordinate actions, and only service
  modules communicate with the backend. Navigation must not reload the full page.
- Document every endpoint with OpenAPI and provide Swagger UI when routes arrive
  in M3.

## Folders
Frontend templates, styles and JavaScript go in frontend. PHP code goes in
backend, separated into routes, services and DAOs. SQL files go in database,
documentation in docs and checks in tests.

```text
backend/{routes,services,dao,middleware,config,logs}
frontend/{css,js/{controllers,services,models,views},views,assets}
database; docs; tests
```

Root index.html is the static SPA entry point. frontend/views contains HTML
`<template>` files; frontend/js/views contains the DOM renderers. The template
service loads and caches static view files before the router starts.

## Conventions
Use native browser features before adding libraries. Keep naming consistent,
forms accessible and layouts responsive. Validate input and display it as text.
Put requests in services and make sample-data behavior clear.

- Use ES modules, semantic HTML, visible keyboard focus and accessible labels.
- Use kebab-case HTML template filenames/IDs and camelCase JavaScript functions.
- Clone native templates and fill textContent/value; do not inject markup strings.
- Allow only HTTP(S) URLs. Keep fetch calls out of renderers.
- Static role restrictions are not real security.

## Milestones and security
Work only on the current milestone. Enforce authentication and permissions in
the backend, and register new accounts as regular users. Keep secrets and logs
out of Git and don’t expose internal errors.

- Current milestone: M1, static SPA with sample data and database planning.
- M2 adds MySQL/DAOs; M3 services/routes/GitHub/OpenAPI;
  M4 JWT/roles/middleware/logging/full integration; M5 final validation/deployment.
- Missing, invalid or expired JWT: 401. Insufficient permissions: 403.
- Keep installed dependency directories out of Git.

## Git and submission
Use milestone1 through milestone5 and keep commits focused. Only the course
reviewer merges; start the next branch afterward. Ask me before pushing,
inviting collaborators, submitting or deploying. Report results honestly.

- These exact branch names override any default branch prefix.
- Never fabricate AI mistakes, test results, working APIs, live status or
  course submission evidence.

## Verification
Run the app locally and test both roles, responsive layouts and keyboard
navigation. Run the service, template and syntax checks before calling the work
complete, and report any failures honestly.

- Local server: `php -S 127.0.0.1:8080 -t .`.
- Service checks: `node tests/services.mjs` (no external dependencies).
- Template checks: open `/tests/templates.html` through the local server.
- PHP syntax: `php -l backend/config/config.example.php`.
- JavaScript syntax: `node --check` for changed JavaScript modules.
- Whitespace: `git diff --check`.
- M1 data and passwords live in memory and reset on reload; mock authentication
  is not backend security.

## Design and lookup rules
Keep the existing layout and adapt it for small screens. Make deployment labels
visible and searchable. Treat statuses as recorded data, not live monitoring,
and show installed and upstream versions without guessing updates.

- Read PRODUCT.md and DESIGN.md before UI edits. If available locally, also read
  .impeccable/surfaces/index-html.md; .impeccable/ is ignored tooling data.
- Keep top navigation and two panes. At <=650px, show the list or selected record
  with a return link.
- Include deployment labels in the index, related tables and overview to
  distinguish instances of the same application on the same server.
- Future hosting must keep config, logs and Git files private. The root PHP
  static server is for local M1 use only.
