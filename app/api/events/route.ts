import { env } from "cloudflare:workers";
import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { calendarEvents } from "../../../db/schema";
import { jsonResponse, optionsResponse } from "../../../lib/api-response";
import {
  parseNewCalendarEvent,
  type CalendarEvent,
} from "../../../lib/calendar-events";
import {
  calendarEventSnapshotSql,
  toCalendarEvent,
} from "../../../lib/server-calendar-audit";
import {
  getAccessIdentity,
  getAccessRole,
} from "../../../lib/server-auth";

function eventIdFromPayload(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const id = (value as Record<string, unknown>).id;
  return typeof id === "string" ? id.trim() : "";
}

async function getAdminActor(request: Request) {
  const identity = await getAccessIdentity(request);
  if (identity?.role !== "teacher") {
    return {
      response: jsonResponse(
        request,
        { error: "Nur der Admin-Zugang darf Termine verändern." },
        { status: identity ? 403 : 401 },
      ),
    };
  }
  if (!identity.actorEmail) {
    return {
      response: jsonResponse(
        request,
        {
          error:
            "Bitte melden Sie sich erneut über die verifizierte Admin-E-Mail an.",
        },
        { status: 401 },
      ),
    };
  }
  return { actorEmail: identity.actorEmail };
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const role = await getAccessRole(request);
    if (!role) {
      return jsonResponse(request, { error: "Zugang abgelaufen." }, { status: 401 });
    }

    const rows = await getDb()
      .select()
      .from(calendarEvents)
      .orderBy(asc(calendarEvents.startDate), asc(calendarEvents.title));

    return jsonResponse(request, { events: rows.map(toCalendarEvent) });
  } catch (error) {
    return jsonResponse(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Die Termine konnten nicht geladen werden.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminActor(request);
    if ("response" in admin) return admin.response;

    const parsed = parseNewCalendarEvent(await request.json());
    if ("error" in parsed) {
      return jsonResponse(request, { error: parsed.error }, { status: 400 });
    }

    const event: CalendarEvent = { id: crypto.randomUUID(), ...parsed.event };
    const auditId = crypto.randomUUID();
    const changedAt = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO calendar_events (
          id, type, category, title, start_date, end_date, time,
          audience, location, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        event.id,
        event.type,
        event.category,
        event.title,
        event.startDate,
        event.endDate ?? null,
        event.time ?? null,
        event.audience,
        event.location ?? null,
        event.description ?? null,
      ),
      env.DB.prepare(`
        INSERT INTO calendar_event_audit_logs (
          id, event_id, action, actor_name, actor_role, changed_at,
          before_state, after_state, restored_from_log_id
        ) VALUES (?, ?, 'create', ?, 'teacher', ?, NULL, ?, NULL)
      `).bind(
        auditId,
        event.id,
        admin.actorEmail,
        changedAt,
        JSON.stringify(event),
      ),
    ]);

    return jsonResponse(request, { event }, { status: 201 });
  } catch (error) {
    return jsonResponse(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Der Termin konnte nicht gespeichert werden.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getAdminActor(request);
    if ("response" in admin) return admin.response;

    const payload: unknown = await request.json();
    const id = eventIdFromPayload(payload);
    if (!id || id.length > 128) {
      return jsonResponse(request, { error: "Der Termin ist nicht gültig." }, { status: 400 });
    }

    const parsed = parseNewCalendarEvent(payload);
    if ("error" in parsed) {
      return jsonResponse(request, { error: parsed.error }, { status: 400 });
    }

    const event: CalendarEvent = { id, ...parsed.event };
    const auditId = crypto.randomUUID();
    const changedAt = new Date().toISOString();
    const results = await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO calendar_event_audit_logs (
          id, event_id, action, actor_name, actor_role, changed_at,
          before_state, after_state, restored_from_log_id
        )
        SELECT ?, calendar_events.id, 'update', ?, 'teacher', ?,
          ${calendarEventSnapshotSql}, ?, NULL
        FROM calendar_events
        WHERE calendar_events.id = ?
      `).bind(
        auditId,
        admin.actorEmail,
        changedAt,
        JSON.stringify(event),
        id,
      ),
      env.DB.prepare(`
        UPDATE calendar_events
        SET type = ?, category = ?, title = ?, start_date = ?, end_date = ?,
          time = ?, audience = ?, location = ?, description = ?
        WHERE id = ?
      `).bind(
        event.type,
        event.category,
        event.title,
        event.startDate,
        event.endDate ?? null,
        event.time ?? null,
        event.audience,
        event.location ?? null,
        event.description ?? null,
        id,
      ),
    ]);

    if ((results[0].meta.changes ?? 0) === 0) {
      return jsonResponse(request, { error: "Der Termin wurde nicht gefunden." }, { status: 404 });
    }

    return jsonResponse(request, { event });
  } catch (error) {
    return jsonResponse(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Der Termin konnte nicht bearbeitet werden.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminActor(request);
    if ("response" in admin) return admin.response;

    const payload: unknown = await request.json();
    const id = eventIdFromPayload(payload);
    if (!id || id.length > 128) {
      return jsonResponse(request, { error: "Der Termin ist nicht gültig." }, { status: 400 });
    }

    const auditId = crypto.randomUUID();
    const changedAt = new Date().toISOString();
    const results = await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO calendar_event_audit_logs (
          id, event_id, action, actor_name, actor_role, changed_at,
          before_state, after_state, restored_from_log_id
        )
        SELECT ?, calendar_events.id, 'delete', ?, 'teacher', ?,
          ${calendarEventSnapshotSql}, NULL, NULL
        FROM calendar_events
        WHERE calendar_events.id = ?
      `).bind(auditId, admin.actorEmail, changedAt, id),
      env.DB.prepare("DELETE FROM calendar_events WHERE id = ?").bind(id),
    ]);

    if ((results[0].meta.changes ?? 0) === 0) {
      return jsonResponse(request, { error: "Der Termin wurde nicht gefunden." }, { status: 404 });
    }

    return jsonResponse(request, { id });
  } catch (error) {
    return jsonResponse(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Der Termin konnte nicht gelöscht werden.",
      },
      { status: 500 },
    );
  }
}
