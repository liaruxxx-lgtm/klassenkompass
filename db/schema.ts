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
