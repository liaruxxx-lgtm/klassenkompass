import { desc, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { calendarEventAuditLogs } from "../../../db/schema";
import { jsonResponse, optionsResponse } from "../../../lib/api-response";
import { toAuditLog } from "../../../lib/server-calendar-audit";
import { getAccessIdentity } from "../../../lib/server-auth";

const pageSize = 50;

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const identity = await getAccessIdentity(request);
    if (identity?.role !== "teacher") {
      return jsonResponse(
        request,
        { error: "Nur der Admin-Zugang darf das Änderungsprotokoll sehen." },
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

    const offsetValue = new URL(request.url).searchParams.get("offset") ?? "0";
    const offset = /^\d+$/.test(offsetValue)
      ? Math.min(Number(offsetValue), 100_000)
      : 0;
    const rows = await getDb()
      .select()
      .from(calendarEventAuditLogs)
      .orderBy(
        desc(calendarEventAuditLogs.changedAt),
        desc(sql<number>`rowid`),
      )
      .limit(pageSize + 1)
      .offset(offset);

    return jsonResponse(request, {
      logs: rows.slice(0, pageSize).map(toAuditLog),
      hasMore: rows.length > pageSize,
    });
  } catch (error) {
    return jsonResponse(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Das Änderungsprotokoll konnte nicht geladen werden.",
      },
      { status: 500 },
    );
  }
}
