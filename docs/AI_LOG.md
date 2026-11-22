# AI assistance log

## Milestone 1 — 26 October 2026

### Tools used
- I used Codex to help plan the scope, implement the static frontend and
  sample-data services, run checks and draft documentation.
- I used Impeccable to explore layout options and review the interface. This
  included generated mockups and separate design reviews through Codex.
- I also used the Improve skill separately for code review and improvement
  suggestions.
- Codex used the Ponytail skill to guide simpler implementations with native
  browser features and plain JavaScript.

### Important prompts and decisions
- Asked Impeccable for design suggestions and the starting design documents.
- “can you edit and interactively rebase an existing commit to introduce these
  changes?” — this was for moving the HTML templates into frontend/views.

I chose the Service binder design with top navigation and a list/detail layout.

### Code mistakes and corrections

These issues were identified and corrected during code review and browser testing.

1. **Notes were cut off when saving.** The initial save logic shortened notes to
   5,000 characters without telling the user. Reviewing the validation code showed
   that this could lose part of the input. The fix rejects notes over the limit
   before changing the record. The service test submits 5,001 characters and
   checks that an error is returned and the saved data stays unchanged.

2. **An old success message stayed visible after a failed action.** During browser
   tests, deleting a record showed a success message. Trying to delete a server
   with linked deployments then showed an error, but the old success message was
   still visible. Task validation showed the same problem. The controller now
   clears previous notices when a new action starts or a form error appears.
   The browser checks confirmed that the old notice no longer accompanied the error.

3. **The skip link was treated as a page route.** Reviewing the skip link showed
   that its #main target conflicted with the SPA hash router. It could send the
   user to an unknown route instead of the main content. A click handler now
   prevents the route change and focuses the main element. Keyboard testing
   confirmed that focus moved to main while the deployment URL stayed unchanged.

4. **Deployment labels were missing from lists and search.** Review found that
   production and staging instances of the same app on the same server looked
   identical in the list. Searching for staging also failed because the label
   was missing from the searchable text. The fix adds the server and label to
   each deployment row and keeps labels in related tables and overview links.
   Service checks cover the two instances, and a browser search for staging
   returned only the staging deployment.

## Milestone 2 — 27 October 2026

### Tools used
- I used Codex to plan the details of the MySQL schema/export, base DAO and inspiration
   for the entity DAO's, as well as for documentation 
- The Ponytail skill guided a plain PHP/PDO implementation without additional
  runtime dependencies or an ORM.

### Important prompts and decisions
- “fix the whitespace checks across all required fields, check regression tests
  and test everything locally again” — corrected the SQL checks
  after review reproduced the whitespace-only outcome bug.
- "what are some proposed entities that would suit my application?" 

### Actual mistakes and corrections

1. **The first DAO checks assumed only one pair of foreign-key error codes.**
   The local suite failed because it expected MySQL 1452 but the restricted test
   account received 1216. MySQL also uses 1217 instead of 1451 for restricted
   accounts. The assertions now recognize both documented variants for each
   failure. No privileges were broadened to make the tests pass. The suite then
   passed against the account limited to SELECT/INSERT/UPDATE/DELETE. The
   [MySQL error reference](https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)
   describes both pairs; [MySQL's explanation](https://bugs.mysql.com/bug.php?id=99336)
   covers the privilege-dependent behavior.

2. **The SQL nonblank checks only removed ordinary spaces.** Review reproduced
   completed tasks whose outcomes were only tabs or line breaks. TRIM() did not
   remove those characters, and the initial checks only tested spaces. New DAO
   regressions first failed on a tab-only user name against the old schema. The
   SQL now uses REGEXP_LIKE to require a character outside ICU Unicode whitespace
   and U+FEFF.

## Milestone 3 — 22 November 2026

### Tools used

- I used Codex to implement the PHP services, FlightPHP routes, GitHub release
  lookup and OpenAPI documentation, and to run local API and database checks.
- I used the Improve skill to review the M3 changes and write plans for test
  database isolation, GitHub redirects and OpenAPI validation rules.
- The Ponytail skill guided reuse of the existing PDO DAOs and a small
  FlightPHP setup.

### Important prompts and decisions

- extended the first server API to the other four entities.
- Kept the frontend on sample data until M4, with Swagger UI for testing the
  API separately. Automated checks used disposable MySQL databases.

### Actual mistakes and corrections

1. **The HTTP 405 response listed only some supported methods.** The first route
   definitions registered each HTTP method separately. A request using an
   unsupported method returned HTTP 405, but its `Allow` header listed only
   the methods from the last matching route. Grouping methods by URL path
   corrected the header. The HTTP test now checks the complete method list.

2. **The last-admin check returned an internal error.** The namespaced user DAO
   used `PDO::FETCH_COLUMN` without importing PDO. The HTTP integration test
   exposed the missing import when checking user deletion. Adding the import
   corrected the lookup. The tests then passed for user deletion and for
   rejecting deletion or demotion of the final admin.
