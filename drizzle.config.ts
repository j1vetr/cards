import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // `user_sessions` is managed by connect-pg-simple, not Drizzle. Excluding it
  // keeps drizzle-kit push non-interactive (otherwise new tables trigger a
  // "rename from user_sessions?" prompt that aborts on non-TTY stdin).
  tablesFilter: ["*", "!user_sessions"],
});
