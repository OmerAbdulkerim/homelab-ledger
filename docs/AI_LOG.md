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
