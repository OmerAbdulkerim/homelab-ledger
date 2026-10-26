# Homelab Ledger

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
HTML, CSS and JavaScript SPA. PHP with FlightPHP, MySQL and PDO for the backend.
Backend: routes → services → DAO → database. Frontend requests belong in services.
M1 uses in-memory sample data; backend integration is scheduled for M2–M4.

## Users
An admin maintaining a personal homelab and regular users who read inventory and
contribute to maintenance. The course reviewer also evaluates the implementation.

## Product Purpose
Keep track of what runs on each server, its installed version and URL, and the
maintenance that still needs doing. The project should remain useful after class.

## Operating Context
One shared homelab with manually maintained records. Most work involves finding
a deployment, updating its details or completing a maintenance task.

## Capabilities and Constraints
- Five entities: users, servers, applications, deployments and maintenance tasks.
- Each deployment links one app to one server; labels distinguish multiple instances.
- Tasks target one server or deployment and may have an assignee.
- GitHub release information will appear beside installed versions. Different
  version strings alone do not establish whether an update is needed.
- Admins manage all records; regular users read inventory, create tasks, edit
  assigned tasks and manage their profiles.
- No provisioning, SSH, live monitoring, infrastructure credentials or automatic
  updates. Completed tasks record outcomes; deployment history is deferred.
- Course requirements govern the stack, five CRUD entities and milestone order.
  Only the course reviewer merges milestone branches.

## Brand Commitments
Plain language and a readable inventory interface. The selected Service binder
layout uses top navigation and a list/detail view. Tokens are in DESIGN.md.

## Evidence on Hand
Requirements come from the project handover and original course PDF. No personal
inventory was supplied, so hosts, versions, URLs and tasks are labelled examples.
Generated mockups are design references, not evidence of running infrastructure.

## Product Principles
- Make inventory lookup and maintenance straightforward.
- Keep recorded status separate from live health and GitHub releases.
- Enforce permissions in the backend when it is added.
- Keep AI assistance, test results and submission status accurate.
