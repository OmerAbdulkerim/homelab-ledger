---
name: Homelab Ledger
description: A restrained service binder for manually recorded inventory and maintenance.
colors:
  primary: "#c24c1e"
  primary-hover: "#a23d18"
  canvas: "#f8f9f6"
  ink: "#142e49"
  secondary-ink: "#52677e"
  rule: "#d7e1e5"
  selected: "#e1e9ed"
  muted-surface: "#eef2f1"
  focus: "#285d82"
  danger: "#a33327"
  white: "#fff"
  control-border: "#cbd6dd"
  field-border: "#b7c5cf"
  danger-border: "#c9a9a4"
  placeholder: "#65768a"
  navigation-hover: "#e9efef"
  row-hover: "#eaf0ef"
  text-selection: "#cddfe9"
  release-link: "#1263b5"
  error-surface: "#f6e7e4"
  completed-surface: "#e4ece4"
  completed-ink: "#315534"
  progress-surface: "#e4ebef"
  open-surface: "#f4eae2"
  open-ink: "#843f24"
  symbol-rose: "#a44d6c"
  symbol-blue: "#315571"
  symbol-olive: "#4a772e"
  symbol-green: "#337950"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "2.625rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.025em"
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.02em"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
rounded:
  control: "0.25rem"
  dialog: "0.5rem"
spacing:
  quarter: "0.25rem"
  half: "0.5rem"
  three-quarters: "0.75rem"
  one: "1rem"
  five-quarters: "1.25rem"
  one-half: "1.5rem"
  two: "2rem"
  three: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1.0625rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1.0625rem"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1.0625rem"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.6875rem 0.75rem"
  navigation-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "1.125rem 0.75rem"
  record-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "1.125rem 1.25rem"
  status-badge:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.25rem 0.5rem"
---

# Homelab Ledger design notes

## Layout
Use top navigation and a searchable list beside the selected record. Forms open
in the detail pane. Overview shows pending maintenance and servers.
At 650px and below, show the list or the selected record with a return link.
Keep navigation scrollable and tables inside their own scroll containers.

## Colors and type
Use the values in the frontmatter and `frontend/css/app.css`: off-white background,
blue-gray text, pale-blue selection and rust primary actions. Status badges also
include text; color alone must not convey status.

Arial, Helvetica, sans-serif is used throughout. Headings identify pages and
records; versions use tabular numerals. Keep labels readable and avoid making
ordinary metadata compete with record names.

## Components
- Separate content with spacing and thin rules. Shadows are limited to notices
  and the delete dialog.
- Use rectangular buttons, visible field labels and consistent line icons.
- Mark selected navigation and records with a fill and border.
- Show server and deployment label in lists, related tables and search results.
- Display installed and sample GitHub release versions side by side.
- Show loading, failure, no-release and unlinked-repository states explicitly.
- Use a native delete dialog, with the cancel action focused initially.
- Preserve visible keyboard focus, the skip link and reduced-motion support.

## Copy and data
Use task labels such as “Overview” and “Log in”, rather than slogans.
Keep the sample-data/reset notice and demo-password guidance. Statuses are
manually recorded; release responses are simulated in M1. Hidden admin controls
are a preview of permissions, with backend enforcement scheduled for M4.

## Design history
The selected direction was Service binder, composition B, using top navigation
and two panes. Generated references are under `.impeccable/mocks/`; they are not
application assets. AI assistance is documented in [AI_LOG.md](docs/AI_LOG.md).
