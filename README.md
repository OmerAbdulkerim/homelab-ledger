# Homelab Ledger

A Web Programming course project for tracking servers, self-hosted applications,
installed versions and maintenance tasks in a shared homelab.

## Milestone 1
The static SPA includes login, registration, profile editing and CRUD screens for
users, servers, applications, deployments and maintenance. It uses sample data
and demo authentication; changes reset on refresh. The PHP API, MySQL database,
JWT authentication and live GitHub requests will be added in later milestones.

## Entities and roles
A deployment links an application to a server. Labels distinguish instances such
as production and staging. A maintenance task targets one server or deployment
and may be assigned to a user. See the [ERD](docs/ERD.md) for fields and rules.

- **Admin:** manage all records, users and task assignments.
- **Regular user:** read inventory, create tasks, edit assigned tasks and manage
  their profile. Backend permission checks arrive in M4.

| Demo role | Email | Password |
| --- | --- | --- |
| Admin | admin@homelab.example | ledger-admin |
| Regular user | user@homelab.example | ledger-user |

Use the demo buttons or these credentials. Registration creates a regular user.
Use a made-up password: M1 accounts are stored in memory.

## Run locally
From the repository root:

```sh
php -S 127.0.0.1:8080 -t .
```

Open [Homelab Ledger](http://127.0.0.1:8080). This local server serves static files.
Running the M1 app needs no database or package installation. ES modules require HTTP.

For M2, the SQL export will be in `database/`. Copy
`backend/config/config.example.php` to ignored `backend/config/local.php` and
fill in local credentials when the database is implemented. Keep secrets out of Git.

## GitHub releases
The planned GitHub API feature shows the latest published release beside a
deployment's installed version and links to release notes. M1 uses labelled sample
responses. The preview selector demonstrates a release, no release and a failed
request. Inventory remains usable in each state. The backend integration arrives
in M3, with the connected frontend in M4.

Swagger link: pending M3. Live application link: pending M5.

## Checks

For formatting, install the development tools with npm:

```sh
npm ci
npm run format:check
```

Use `npm run format` to apply formatting fixes. Run the service and syntax checks:

```sh
node tests/services.mjs
php -l backend/config/config.example.php
git diff --check
```

With the server running, open [template checks](http://127.0.0.1:8080/tests/templates.html).
These check rendering, safe text, roles, template caching and failed-load recovery.
Service checks cover CRUD, relationships, permissions and validation.

For a walkthrough, sign in as admin, inspect a deployment, try the release states
and add/edit/delete a test record. Then sign in as the regular user and complete
an assigned task. Refresh restores the sample data.

## Structure
- Backend: `routes`, `services`, `dao`, `middleware`, `config`, `logs`.
- Frontend: `css`, `js/{controllers,services,models,views}`, `views`, `assets`.
- `index.html` starts the SPA; `database`, `docs` and `tests` hold supporting files.
- Backend flow: routes → services → DAO → MySQL, using PDO prepared statements.
- HTML templates live in `frontend/views`; renderers in `frontend/js/views` clone
  and fill them. A service loads the nine template files once, with retry on failure.
- Controllers coordinate actions; only service modules make HTTP requests.

The interface uses a searchable list and detail pane. On mobile, the list and
selected record are separate views. See the [design notes](DESIGN.md).
