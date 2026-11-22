# Homelab Ledger

A Web Programming course project for tracking servers, self-hosted applications,
installed versions and maintenance tasks in a shared homelab.

## Milestone 3

The local FlightPHP API supports listing, creating, reading, partially updating
and deleting servers, applications, deployments, maintenance tasks and users.
Services validate requests, and the M2 DAOs persist records in MySQL. The API
returns conflicts for duplicate deployment labels or emails, restricted deletes,
and attempts to remove or demote the last admin. New accounts start as regular
users, and user responses exclude passwords and password hashes.

Use PHP 8.1+ with `curl`, `mbstring` and `pdo_mysql`. Set up MySQL as described
below and point the ignored `database` configuration
at a local database imported from the sample SQL. From the repository root, run:

```sh
composer install
npm ci
php -S 127.0.0.1:8081 -t backend/public backend/public/index.php
```

Open [Swagger UI](http://127.0.0.1:8081/docs) or load the
[OpenAPI document](http://127.0.0.1:8081/openapi.json). The preview accepts local
loopback requests and has no authentication. Use only local sample data. The SPA
runs separately on port 8080 with sample data until M4.

## Milestone 2
MySQL persistence now includes five tables, sample data and PDO CRUD DAOs with a
shared base class. The [SQL export](database/homelab-ledger.sql) targets MySQL
8.0.16+ and uses InnoDB, utf8mb4, primary/foreign keys, unique keys and enforced
CHECK constraints. PHP 8.1+ with `pdo_mysql` is required for the DAOs.

Server records include optional OS/version, CPU model/core count, RAM in MiB and
storage in GiB. Unknown specifications are NULL, supplied text must be nonblank
and numeric capacities/counts must be positive. Servers and deployments also return
database-managed UTC creation/update timestamps; DAO callers cannot set them.
The sample specifications and timestamps are synthetic, not detected hardware.

The static SPA includes login, registration, profile editing and CRUD screens for
users, servers, applications, deployments and maintenance. It uses sample data
and demo authentication; frontend changes still reset on refresh. The database
is independent of the UI until JWT authentication and frontend integration arrive
in M4.

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
Use a made-up password: frontend accounts are stored in memory. The SQL contains
the same two sample users with PHP password hashes; backend login is pending M4.

## Run locally
From the repository root:

```sh
php -S 127.0.0.1:8080 -t .
```

Open [Homelab Ledger](http://127.0.0.1:8080). This local server serves static files.
Running the M1 app needs no database or package installation. ES modules require HTTP.

### MySQL setup

Create two empty databases using a local MySQL administrator account:

```sql
CREATE DATABASE homelab_ledger CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
CREATE DATABASE homelab_ledger_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
```

Import the export into each database, using the administrator account for schema
creation. Adjust the host, port and username to your local MySQL installation:

```sh
mysql --host=127.0.0.1 --port=3306 --user=root --password homelab_ledger < database/homelab-ledger.sql
mysql --host=127.0.0.1 --port=3306 --user=root --password homelab_ledger_test < database/homelab-ledger.sql
cp backend/config/config.example.php backend/config/local.php
```

Fill in the `database` and `test_database` settings in ignored `local.php`. Use
separate MySQL users, each granted only `SELECT, INSERT, UPDATE, DELETE` on its
own database. Schema import uses the administrator; application/test users need
no schema-changing privileges. Keep passwords out of Git and shell history.

The export creates tables and sample records without dropping existing tables
or selecting a database. Import it into an empty database; do not re-import it
over existing inventory. It is also the M2 schema definition. It was exported
with MySQL 8.0.46 and tested with PHP 8.5.11. MariaDB is not the tested target.

M2 has one initial schema/export and no migration runner. The revised export
includes server specifications and record timestamps. Previously imported schemas
are not upgraded automatically: use a fresh disposable test database for this
revision and update its ignored test configuration. Preserve existing inventory;
do not run the initial export over it.

`Database::connect()` reads the application configuration. It enables native
prepared statements, exceptions, strict SQL mode, associative results and UTC.
The [ERD and persistence notes](docs/ERD.md) describe fields and constraints.

### DAO contract

`UserDao`, `ServerDao`, `ApplicationDao`, `DeploymentDao` and `MaintenanceTaskDao`
accept a PDO connection and inherit these methods from `BaseDao`:

| Method | Result |
| --- | --- |
| `getAll()` | Rows ordered by ID |
| `getById($id)` | Row, or `null` when missing |
| `create($data)` | Inserted row, including its generated ID |
| `update($id, $data)` | Partially updated row, or `null` when missing |
| `delete($id)` | `true` if a row was deleted, otherwise `false` |

`UserDao::getByEmail()` provides an internal credential lookup. DAO rows include
`password_hash`, which the user service removes from API responses. DAOs enforce
writable field names and value types, and SQL enforces structural constraints
and relationships. The API converts database errors to client-safe responses.

## GitHub releases

`GET /api/applications/{id}/release` looks up the latest published release for
the repository saved on an application. For a release it returns the tag,
publication time and release-notes URL. An unlinked application or a readable
repository with no release returns its own state. Provider failures and rate
limits return `502` and `503` respectively.

Public repositories work without a token. An optional `github_token` belongs in
the ignored backend config. Fine-grained tokens need Contents read permission
for the repository. [GitHub releases API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)

The static SPA still demonstrates the upstream states with sample data. M4 will
connect it to the API and display the release beside the recorded installed
version.

Live application link: pending M5.

## Checks

For formatting, install the development tools with npm:

```sh
npm ci
npm run format:check
```

Use `npm run format` to apply formatting fixes. Run the service and syntax checks:

```sh
node tests/services.mjs
php tests/dao.php
find backend tests -name '*.php' ! -name local.php -exec php -l {} \;
git diff --check
```

DAO checks require the separately imported `test_database`, whose name must end in
`_test` and differ from the application database. They cover all five CRUD DAOs,
native prepared statements, literal hostile input, Unicode, missing IDs,
partial/no-op updates, uniqueness, foreign keys, task targets/completion, strict
dates and user-assignment cleanup. Server specification checks cover NULL defaults
and clearing, partial updates, Unicode, text lengths, positive numeric boundaries
and invalid values. Timestamp checks use a controlled session clock to verify UTC
defaults, creation-time preservation, automatic updates, no-ops and rejection of
caller-supplied timestamps for both servers and deployments. The checks also
compare populated specification/timestamp lists, individual maximum updates and
clearing, field-specific no-ops, mixed read-only writes and SQL-failure atomicity.
Both test phases roll back row changes and reset their controlled clocks.
Required-text regressions cover inserts and updates for every required or
conditionally required field, including tabs, line breaks, Unicode spaces and
U+FEFF-only values. Nonblank Unicode text is preserved and optional empty fields
remain valid. The checks roll back row changes on success or failure.
Auto-increment counters can advance despite rollback, so ID gaps are expected. The
suite expects the original sample rows; use a disposable test database and import
a fresh copy if you have edited its fixtures.

With the server running, open [template checks](http://127.0.0.1:8080/tests/templates.html).
These check rendering, safe text, roles, template caching and failed-load recovery.
Service checks cover CRUD, relationships, permissions and validation.

For a walkthrough, sign in as admin, inspect a deployment, try the release states
and add/edit/delete a test record. Then sign in as the regular user and complete
an assigned task. Refresh restores the sample data.

Run `node tests/api-isolation.mjs` to check that the HTTP suite refuses unsafe
targets. The CRUD suite needs a separate disposable `test_database` at
`127.0.0.1` whose name ends in `_test` and differs from `database`. Import the
sample SQL into that empty schema and use an account restricted to that schema.
In a dedicated shell, start a test-mode server on a free port and wait for PHP
to report that it is listening before running the suite:

```sh
export HOMELAB_API_TEST_RUN="$(openssl rand -hex 16)"
php -S 127.0.0.1:18081 -t backend/public backend/public/index.php &
api_test_pid=$!
trap 'kill "$api_test_pid" 2>/dev/null || true; unset HOMELAB_API_TEST_RUN' EXIT
# Wait for PHP to report that it is listening.
node tests/api.mjs http://127.0.0.1:18081
```

The server verifies its test database connection and the runner verifies the
per-run header and sample users before sending writes. The suite removes its
temporary records. Exit the dedicated shell to stop the test server.
`php tests/github-release.php` checks GitHub response states with fixtures.

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
