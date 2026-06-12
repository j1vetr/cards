---
name: drizzle-kit push friction in this repo
description: Why `npm run db:push` stalls/aborts here and how to apply schema changes reliably.
---

# drizzle-kit push is effectively non-interactive-hostile here

`npm run db:push` (drizzle-kit) uses clack prompts that **abort/hang on non-TTY stdin**.
Piping newlines fails (clack cancels → SIGTERM/exit 143); feeding via a `script` PTY
with an EOF answers-file hangs (exit 124). So the command cannot be driven from the
agent shell once it hits a prompt.

Two prompts trigger in this project:
1. **Rename ambiguity for new tables.** `user_sessions` (connect-pg-simple table) is
   intentionally NOT in `shared/schema.ts`. Any *new* table makes drizzle ask
   "is X renamed from user_sessions?". Fixed permanently by adding
   `tablesFilter: ["*", "!user_sessions"]` to `drizzle.config.ts`.
2. **refresh_tokens unique constraint naming drift (pre-existing, out of scope).**
   DB has `refresh_tokens_token_key` (Postgres auto-name) but drizzle expects
   `refresh_tokens_token_unique`, so it always prompts to add it. Leave it alone.

**How to apply schema changes:** edit `shared/schema.ts` for the types, then apply the
DDL directly via idempotent SQL (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD
COLUMN IF NOT EXISTS`, constraints guarded by `DO $$ IF NOT EXISTS ... $$`). Use
drizzle's constraint naming convention `<table>_<col>_<reftable>_<refcol>_fk` and
`<table>_<col>_unique` so the DB matches the schema and future pushes see no diff for
your objects. Verify with `information_schema` + `pg_constraint`, then `npx tsc --noEmit`.

**Why:** push is the documented workflow but is blocked by the two prompts above;
direct idempotent DDL that mirrors the Drizzle column/constraint definitions keeps the
DB in sync without drift.
