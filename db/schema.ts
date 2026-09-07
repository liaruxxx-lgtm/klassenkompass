import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    time: text("time"),
    audience: text("audience").notNull(),
    location: text("location"),
    description: text("description"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_calendar_events_start_date").on(table.startDate)],
);

export const calendarEventSeedRuns = sqliteTable("calendar_event_seed_runs", {
  seedKey: text("seed_key").primaryKey(),
  seededAt: text("seeded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accessSessions = sqliteTable(
  "access_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    role: text("role").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_access_sessions_expires_at").on(table.expiresAt)],
);

export const accessSessionActors = sqliteTable("access_session_actors", {
  tokenHash: text("token_hash").primaryKey(),
  actorEmail: text("actor_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Kept for compatibility with already-applied migrations. The email-login
// endpoints are removed and runtime initialization clears any legacy rows.
export const adminLoginChallenges = sqliteTable(
  "admin_login_challenges",
  {
    id: text("id").primaryKey(),
    adminEmail: text("admin_email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    attempts: integer("attempts").notNull().default(0),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_admin_login_challenges_admin_email").on(table.adminEmail),
    index("idx_admin_login_challenges_expires_at").on(table.expiresAt),
  ],
);

export const calendarEventAuditLogs = sqliteTable(
  "calendar_event_audit_logs",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    action: text("action").notNull(),
    actorEmail: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(),
    changedAt: text("changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    beforeState: text("before_state"),
    afterState: text("after_state"),
    restoredFromLogId: text("restored_from_log_id"),
  },
  (table) => [
    index("idx_calendar_event_audit_logs_changed_at").on(table.changedAt),
    index("idx_calendar_event_audit_logs_event_id").on(table.eventId),
  ],
);

export const accessRateLimits = sqliteTable(
  "access_rate_limits",
  {
    identifierHash: text("identifier_hash").primaryKey(),
    failures: integer("failures").notNull(),
    windowStartedAt: integer("window_started_at").notNull(),
    blockedUntil: integer("blocked_until"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_access_rate_limits_updated_at").on(table.updatedAt)],
);
