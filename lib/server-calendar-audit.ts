import type { CalendarEventAuditLog, AuditAction } from "./audit-logs";
import {
  parseNewCalendarEvent,
  type CalendarEvent,
} from "./calendar-events";
import { calendarEventAuditLogs, calendarEvents } from "../db/schema";

export const calendarEventSnapshotSql = `json_object(
  'id', calendar_events.id,
  'type', calendar_events.type,
  'category', calendar_events.category,
  'title', calendar_events.title,
  'startDate', calendar_events.start_date,
  'endDate', calendar_events.end_date,
  'time', calendar_events.time,
  'audience', calendar_events.audience,
  'location', calendar_events.location,
  'description', calendar_events.description
)`;

export function toCalendarEvent(row: typeof calendarEvents.$inferSelect): CalendarEvent {
  return {
    id: row.id,
    type: row.type as CalendarEvent["type"],
    category: row.category as CalendarEvent["category"],
    title: row.title,
    startDate: row.startDate,
    ...(row.endDate ? { endDate: row.endDate } : {}),
    ...(row.time ? { time: row.time } : {}),
    audience: row.audience as CalendarEvent["audience"],
    ...(row.location ? { location: row.location } : {}),
    ...(row.description ? { description: row.description } : {}),
  };
}

export function parseAuditSnapshot(
  serialized: string | null,
  expectedEventId?: string,
): CalendarEvent | null {
  if (serialized === null) return null;

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error("Ein gespeicherter Änderungsstand ist beschädigt.");
  }

  if (!value || typeof value !== "object") {
    throw new Error("Ein gespeicherter Änderungsstand ist beschädigt.");
  }

  const id = (value as Record<string, unknown>).id;
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 128 ||
    (expectedEventId !== undefined && id !== expectedEventId)
  ) {
    throw new Error("Ein gespeicherter Änderungsstand gehört nicht zum Termin.");
  }

  const parsed = parseNewCalendarEvent(value);
  if ("error" in parsed) {
    throw new Error("Ein gespeicherter Änderungsstand ist nicht mehr gültig.");
  }

  return { id, ...parsed.event };
}

export function toAuditLog(
  row: typeof calendarEventAuditLogs.$inferSelect,
): CalendarEventAuditLog {
  if (!["create", "update", "delete", "restore"].includes(row.action)) {
    throw new Error("Das Änderungsprotokoll enthält eine unbekannte Aktion.");
  }

  return {
    id: row.id,
    eventId: row.eventId,
    action: row.action as AuditAction,
    actorEmail: row.actorEmail,
    changedAt: row.changedAt,
    beforeState: parseAuditSnapshot(row.beforeState, row.eventId),
    afterState: parseAuditSnapshot(row.afterState, row.eventId),
    ...(row.restoredFromLogId
      ? { restoredFromLogId: row.restoredFromLogId }
      : {}),
  };
}
