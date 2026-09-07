import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { calendarEventAuditLogs } from "../../../../db/schema";
import { jsonResponse, optionsResponse } from "../../../../lib/api-response";
import {
  calendarEventSnapshotSql,
  parseAuditSnapshot,
} from "../../../../lib/server-calendar-audit";
import { getAccessIdentity } from "../../../../lib/server-auth";

function auditLogIdFromPayload(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const id = (value as Record<string, unknown>).auditLogId;
  return typeof id === "string" ? id.trim() : "";
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const identity = await getAccessIdentity(request);
    if (identity?.role !== "teacher") {
      return jsonResponse(
        request,
        { error: "Nur der Admin-Zugang darf frühere Stände wiederherstellen." },
        { status: identity ? 403 : 401 },
      );
    }
    if (!identity.actorEmail) {
      return jsonResponse(
        request,
        {
          error:
            "Bitte melden Sie sich erneut mit dem Admin-Passwort an.",
        },
        { status: 401 },
      );
    }

    const auditLogId = auditLogIdFromPayload(await request.json());
    if (!auditLogId || auditLogId.length > 128) {
      return jsonResponse(
        request,
        { error: "Der Protokolleintrag ist nicht gültig." },
        { status: 400 },
      );
    }

    const [sourceLog] = await getDb()
      .select()
      .from(calendarEventAuditLogs)
      .where(eq(calendarEventAuditLogs.id, auditLogId))
      .limit(1);
    if (!sourceLog) {
      return jsonResponse(
        request,
        { error: "Der Protokolleintrag wurde nicht gefunden." },
        { status: 404 },
      );
    }

    const targetState = parseAuditSnapshot(
      sourceLog.beforeState,
      sourceLog.eventId,
    );
    const restoreLogId = crypto.randomUUID();
    const changedAt = new Date().toISOString();
    const auditStatement = env.DB.prepare(`
      INSERT INTO calendar_event_audit_logs (
        id, event_id, action, actor_name, actor_role, changed_at,
        before_state, after_state, restored_from_log_id
      ) VALUES (
        ?, ?, 'restore', ?, 'teacher', ?,
        (SELECT ${calendarEventSnapshotSql}
          FROM calendar_events
          WHERE calendar_events.id = ?),
        ?, ?
      )
    `).bind(
      restoreLogId,
      sourceLog.eventId,
      identity.actorEmail,
      changedAt,
      sourceLog.eventId,
      targetState ? JSON.stringify(targetState) : null,
      sourceLog.id,
    );

    if (targetState) {
      await env.DB.batch([
        auditStatement,
        env.DB.prepare(`
          INSERT INTO calendar_events (
            id, type, category, title, start_date, end_date, time,
            audience, location, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            type = excluded.type,
            category = excluded.category,
            title = excluded.title,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            time = excluded.time,
            audience = excluded.audience,
            location = excluded.location,
            description = excluded.description
        `).bind(
          targetState.id,
          targetState.type,
          targetState.category,
          targetState.title,
          targetState.startDate,
          targetState.endDate ?? null,
          targetState.time ?? null,
          targetState.audience,
          targetState.location ?? null,
          targetState.description ?? null,
        ),
      ]);
    } else {
      await env.DB.batch([
        auditStatement,
        env.DB.prepare("DELETE FROM calendar_events WHERE id = ?").bind(
          sourceLog.eventId,
        ),
      ]);
    }

    return jsonResponse(request, {
      eventId: sourceLog.eventId,
      event: targetState,
    });
  } catch (error) {
    return jsonResponse(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Der frühere Stand konnte nicht wiederhergestellt werden.",
      },
      { status: 500 },
    );
  }
}
