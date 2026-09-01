import type { CalendarEvent } from "./calendar-events";

export type AuditAction = "create" | "update" | "delete" | "restore";

export type CalendarEventAuditLog = {
  id: string;
  eventId: string;
  action: AuditAction;
  actorEmail: string;
  changedAt: string;
  beforeState: CalendarEvent | null;
  afterState: CalendarEvent | null;
  restoredFromLogId?: string;
};
