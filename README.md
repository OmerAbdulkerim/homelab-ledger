# Homelab Ledger

A Web Programming course project for tracking servers, self-hosted applications,
installed versions and maintenance tasks in a shared homelab.

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
is independent of the UI in M2. Services, FlightPHP routes and live GitHub requests
arrive in M3; JWT authentication and frontend integration arrive in M4.

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
`password_hash`; future services must hash incoming passwords and exclude hashes
from API responses. DAOs enforce writable field names and value types; SQL
rejects invalid relationships and structural data. Business validation and
authorization remain M3/M4 work. PDO exceptions stay internal until centralized
HTTP error handling is added; these files expose no API endpoints.

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
