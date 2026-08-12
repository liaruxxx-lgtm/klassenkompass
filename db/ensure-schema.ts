import { env } from "cloudflare:workers";

let initialization: Promise<unknown> | undefined;

export function ensureDatabaseSchema() {
  if (!initialization) {
    const database = env.DB;
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
      ])
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }

  return initialization;
}
