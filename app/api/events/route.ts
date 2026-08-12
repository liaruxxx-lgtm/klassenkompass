import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { calendarEvents } from "../../../db/schema";
import { jsonResponse, optionsResponse } from "../../../lib/api-response";
import { parseNewCalendarEvent } from "../../../lib/calendar-events";
import { getAccessRole } from "../../../lib/server-auth";

function toResponseEvent(row: typeof calendarEvents.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    startDate: row.startDate,
    ...(row.endDate ? { endDate: row.endDate } : {}),
    ...(row.time ? { time: row.time } : {}),
    audience: row.audience,
    ...(row.location ? { location: row.location } : {}),
    ...(row.description ? { description: row.description } : {}),
  };
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

    return jsonResponse(request, { events: rows.map(toResponseEvent) });
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
    const role = await getAccessRole(request);
    if (role !== "teacher") {
      return jsonResponse(
        request,
        { error: "Nur der Admin-Zugang darf Termine hinzufügen." },
        { status: role ? 403 : 401 },
      );
    }

    const parsed = parseNewCalendarEvent(await request.json());
    if ("error" in parsed) {
      return jsonResponse(request, { error: parsed.error }, { status: 400 });
    }

    const event = { id: crypto.randomUUID(), ...parsed.event };
    const [savedEvent] = await getDb()
      .insert(calendarEvents)
      .values(event)
      .returning();

    return jsonResponse(
      request,
      { event: toResponseEvent(savedEvent) },
      { status: 201 },
    );
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
