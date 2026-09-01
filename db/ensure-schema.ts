import { env } from "cloudflare:workers";
import {
  eighthGradeEpochs,
  retiredTestEventIds,
} from "../lib/eighth-grade-epochs";

let initialization: Promise<unknown> | undefined;
const eighthGradeSeedKey = "class-8-periods-2026-27-v1";

export function ensureDatabaseSchema() {
  if (!initialization) {
    const database = env.DB;
    const epochSeedStatements = eighthGradeEpochs.map((event) =>
      database
        .prepare(`
          INSERT INTO calendar_events (
            id,
            type,
            category,
            title,
            start_date,
            end_date,
            audience,
            description
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1
            FROM calendar_event_seed_runs
            WHERE seed_key = ?
          )
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
          eighthGradeSeedKey,
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
          CREATE TABLE IF NOT EXISTS access_session_actors (
            token_hash TEXT PRIMARY KEY NOT NULL,
            actor_name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
        database.prepare(`
          CREATE TABLE IF NOT EXISTS admin_login_challenges (
            id TEXT PRIMARY KEY NOT NULL,
            admin_email TEXT NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            used_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
        database.prepare(`
          CREATE INDEX IF NOT EXISTS idx_admin_login_challenges_admin_email
          ON admin_login_challenges (admin_email)
        `),
        database.prepare(`
          CREATE INDEX IF NOT EXISTS idx_admin_login_challenges_expires_at
          ON admin_login_challenges (expires_at)
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
        database.prepare(`
          CREATE TABLE IF NOT EXISTS calendar_event_audit_logs (
            id TEXT PRIMARY KEY NOT NULL,
            event_id TEXT NOT NULL,
            action TEXT NOT NULL,
            actor_name TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            before_state TEXT,
            after_state TEXT,
            restored_from_log_id TEXT
          )
        `),
        database.prepare(`
          CREATE INDEX IF NOT EXISTS idx_calendar_event_audit_logs_changed_at
          ON calendar_event_audit_logs (changed_at)
        `),
        database.prepare(`
          CREATE INDEX IF NOT EXISTS idx_calendar_event_audit_logs_event_id
          ON calendar_event_audit_logs (event_id)
        `),
        database.prepare(`
          CREATE TABLE IF NOT EXISTS calendar_event_seed_runs (
            seed_key TEXT PRIMARY KEY NOT NULL,
            seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
        database
          .prepare(`
            DELETE FROM calendar_events
            WHERE id IN (?, ?, ?)
          `)
          .bind(...retiredTestEventIds),
        ...epochSeedStatements,
        database
          .prepare(`
            INSERT OR IGNORE INTO calendar_event_seed_runs (seed_key)
            VALUES (?)
          `)
          .bind(eighthGradeSeedKey),
        database.prepare("PRAGMA optimize"),
      ])
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }

  return initialization;
}
