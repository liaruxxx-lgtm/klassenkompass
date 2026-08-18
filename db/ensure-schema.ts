import { env } from "cloudflare:workers";
import {
  eighthGradeEpochs,
  retiredTestEventIds,
} from "../lib/eighth-grade-epochs";

let initialization: Promise<unknown> | undefined;

export function ensureDatabaseSchema() {
  if (!initialization) {
    const database = env.DB;
    const epochSeedStatements = eighthGradeEpochs.map((event) =>
      database
        .prepare(`
          INSERT OR IGNORE INTO calendar_events (
            id,
            type,
            category,
            title,
            start_date,
            end_date,
            audience,
            description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            type = excluded.type,
            category = excluded.category,
            title = excluded.title,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            audience = excluded.audience,
            description = excluded.description
        `)
        .bind(
          event.id,
          event.type,
          event.category,
          event.title,
          event.startDate,
          event.endDate,
          event.audience,
          event.description,
        ),
    );
    initialization = database
      .batch([
        database.prepare(`
          CREATE TABLE IF NOT EXISTS access_sessions (
            token_hash TEXT PRIMARY KEY NOT NULL,
            role TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
        database.prepare(`
          CREATE INDEX IF NOT EXISTS idx_access_sessions_expires_at
          ON access_sessions (expires_at)
        `),
        database.prepare(`
          CREATE TABLE IF NOT EXISTS access_rate_limits (
            identifier_hash TEXT PRIMARY KEY NOT NULL,
            failures INTEGER NOT NULL,
            window_started_at INTEGER NOT NULL,
            blocked_until INTEGER,
            updated_at INTEGER NOT NULL
          )
        `),
        database.prepare(`
          CREATE INDEX IF NOT EXISTS idx_access_rate_limits_updated_at
          ON access_rate_limits (updated_at)
        `),
        database.prepare(`
          CREATE TABLE IF NOT EXISTS calendar_events (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            time TEXT,
            audience TEXT NOT NULL,
            location TEXT,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
        database.prepare(`
          CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date
          ON calendar_events (start_date)
        `),
        database
          .prepare(`
            DELETE FROM calendar_events
            WHERE id IN (?, ?, ?)
          `)
          .bind(...retiredTestEventIds),
        ...epochSeedStatements,
      ])
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }

  return initialization;
}
