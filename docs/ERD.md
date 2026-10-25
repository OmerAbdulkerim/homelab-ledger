# Draft entity model — M1

```mermaid
erDiagram
    USERS o|--o{ MAINTENANCE_TASKS : assigned_to
    SERVERS ||--o{ DEPLOYMENTS : hosts
    APPLICATIONS ||--o{ DEPLOYMENTS : deployed_as
    SERVERS o|--o{ MAINTENANCE_TASKS : targets
    DEPLOYMENTS o|--o{ MAINTENANCE_TASKS : targets
    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        enum role
    }
    SERVERS {
        int id PK
        string name
        string hostname
        string purpose
        text notes
    }
    APPLICATIONS {
        int id PK
        string name
        text description
        string github_owner
        string github_repo
        text notes
    }
    DEPLOYMENTS {
        int id PK
        int application_id FK
        int server_id FK
        string label
        string installed_version
        string url
        enum status
        date deployed_on
        text notes
    }
    MAINTENANCE_TASKS {
        int id PK
        int server_id FK
        int deployment_id FK
        int assigned_user_id FK
        string title
        text description
        enum status
        date due_on
        datetime completed_at
        text outcome
    }
```

- All five entities have admin CRUD in the planned API and M1 mock UI.
- Exactly one task target is required: server_id XOR deployment_id. The ERD's
  optional target edges express each column's nullability, not a targetless task.
- Each deployment has one application and server. Multiple instances on the same
  server are allowed; a label identifies the instance. The planned unique key is
  (application_id, server_id, label), reflected in M1 service validation.
- Emails are unique. Roles: admin, user. Deployment statuses are manually recorded
  running, stopped, or planned, never measured health. Task states: open,
  in_progress, completed. Completed tasks include completion time and outcome.
- Applications optionally link to a GitHub owner/repository pair. GitHub release
  data is external/cache data, not a sixth CRUD entity.
- Restrict deletion of servers/applications with deployments and server/deployment
  targets with task history. Unassign tasks when an otherwise deletable user is
  removed. Protect the last admin and the active account from deletion.
- SQL schema, keys and constraints are implemented in M2. Services enforce rules
  in M3/M4, including target XOR and authorization. SQL checks depend on actual
  hosted MySQL version; use service validation regardless.
- No dedicated deployment history table in the first version. Completed tasks
  retain maintenance outcomes; current version updates are not an audit trail.
