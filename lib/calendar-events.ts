export const eventTypes = [
  "period",
  "milestone",
  "important",
  "presentation",
] as const;

export const categories = [
  "Epochen",
  "Achtklass-Projekt",
  "Achtklass-Stück",
  "Abgaben",
  "Präsentationen",
] as const;

export const audiences = [
  "Gesamte Klasse",
  "Gruppe 1",
  "Gruppe 2",
  "Andere Gruppe",
] as const;

export type EventType = (typeof eventTypes)[number];
export type Category = (typeof categories)[number];
export type Audience = (typeof audiences)[number];

export type CalendarEvent = {
  id: string;
  type: EventType;
  category: Category;
  title: string;
  startDate: string;
  endDate?: string;
  time?: string;
  audience: Audience;
  location?: string;
  description?: string;
};

export type NewCalendarEvent = Omit<CalendarEvent, "id">;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

export function parseNewCalendarEvent(value: unknown):
  | { event: NewCalendarEvent }
  | { error: string } {
  if (!value || typeof value !== "object") {
    return { error: "Der Termin ist unvollständig." };
  }

  const payload = value as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const startDate =
    typeof payload.startDate === "string" ? payload.startDate : "";
  const endDate = optionalText(payload.endDate, 10);
  const time = optionalText(payload.time, 5);
  const location = optionalText(payload.location, 120);
  const description = optionalText(payload.description, 240);

  if (!isOneOf(payload.type, eventTypes)) {
    return { error: "Der Termin-Typ ist nicht gültig." };
  }
  if (!isOneOf(payload.category, categories)) {
    return { error: "Der Bereich ist nicht gültig." };
  }
  if (!title || title.length > 120) {
    return { error: "Bitte einen Titel mit höchstens 120 Zeichen eingeben." };
  }
  if (!datePattern.test(startDate)) {
    return { error: "Bitte ein gültiges Datum eingeben." };
  }
  if (payload.type === "period") {
    if (typeof endDate !== "string" || !datePattern.test(endDate)) {
      return { error: "Bitte ein gültiges Enddatum eingeben." };
    }
    if (endDate < startDate) {
      return { error: "Das Enddatum darf nicht vor dem Startdatum liegen." };
    }
  }
  if (time === null || (time && !timePattern.test(time))) {
    return { error: "Die Uhrzeit ist nicht gültig." };
  }
  if (!isOneOf(payload.audience, audiences)) {
    return { error: "Die Zielgruppe ist nicht gültig." };
  }
  if (location === null || description === null || endDate === null) {
    return { error: "Ein Textfeld ist zu lang oder nicht gültig." };
  }

  return {
    event: {
      type: payload.type,
      category: payload.category,
      title,
      startDate,
      ...(payload.type === "period" && endDate ? { endDate } : {}),
      ...(time ? { time } : {}),
      audience: payload.audience,
      ...(location ? { location } : {}),
      ...(description ? { description } : {}),
    },
  };
}
