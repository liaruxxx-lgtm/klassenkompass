"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Compass,
  Eye,
  EyeOff,
  Flag,
  Leaf,
  ListFilter,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  Presentation,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  categories,
  type Audience,
  type CalendarEvent,
  type Category,
  type EventType,
  type NewCalendarEvent,
} from "../lib/calendar-events";

type AppView = "access" | "student" | "teacher";
type StudentSection = "ueberblick" | "termine" | "jahresblick";

const categoryClass: Record<Category, string> = {
  Epochen: "epoch",
  "Achtklass-Projekt": "project",
  "Achtklass-Stück": "play",
  Abgaben: "assignment",
  Präsentationen: "presentation",
};

const eventTypeLabels: Record<EventType, string> = {
  period: "Epoche / Zeitraum",
  milestone: "Abgabe oder Meilenstein",
  important: "Wichtiger Termin",
  presentation: "Probe oder Präsentation",
};

const defaultCategory: Record<EventType, Category> = {
  period: "Epochen",
  milestone: "Achtklass-Projekt",
  important: "Achtklass-Stück",
  presentation: "Präsentationen",
};

const configuredApiBaseUrl =
  import.meta.env?.VITE_KLASSENKOMPASS_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";

function apiUrl(path: string) {
  return `${configuredApiBaseUrl}${path}`;
}

async function apiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string, includeYear = true) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(parseLocalDate(value));
}

function formatEventDate(event: CalendarEvent) {
  if (event.type === "period" && event.endDate) {
    return `${formatDate(event.startDate, false)} – ${formatDate(event.endDate)}`;
  }
  return formatDate(event.startDate);
}

function compareEvents(a: CalendarEvent, b: CalendarEvent) {
  return a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title);
}

function eventOccursOnDate(event: CalendarEvent, value: string) {
  return event.startDate <= value && (event.endDate ?? event.startDate) >= value;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <Compass strokeWidth={1.8} />
      </span>
      <span className="brand-wordmark">Klassenkompass</span>
    </span>
  );
}

function PrototypeTag() {
  return (
    <span className="prototype-tag">
      <CircleDot size={12} aria-hidden="true" />
      Server-Testversion
    </span>
  );
}

function AccessView({
  onAuthenticate,
}: {
  onAuthenticate: (code: string) => Promise<void>;
}) {
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAccessCodeVisible, setIsAccessCodeVisible] = useState(false);
  const accessCodeRef = useRef<HTMLInputElement>(null);

  async function handleAccessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = accessCode.trim().toUpperCase();
    if (!normalizedCode) {
      setAccessError("Bitte einen Zugangscode eingeben.");
      accessCodeRef.current?.focus();
      return;
    }

    setIsChecking(true);
    setAccessError("");
    try {
      await onAuthenticate(normalizedCode);
    } catch (error) {
      setAccessError(
        error instanceof Error
          ? error.message
          : "Der Zugang konnte nicht geöffnet werden.",
      );
      accessCodeRef.current?.focus();
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="access-page">
      <header className="access-header">
        <Brand />
        <PrototypeTag />
      </header>

      <section className="access-content">
        <div className="access-intro">
          <span className="eyebrow">Orientierung für die achte Klasse</span>
          <h1>Das Wichtige im Blick. Der Kopf bleibt frei.</h1>
          <p className="access-lead">
            Klassenkompass bündelt Epochen, Projekte, Proben und große Termine an
            einem ruhigen Ort – ohne täglichen Pflegeaufwand.
          </p>

          <div className="principle-strip" aria-label="Produktprinzipien">
            <div className="principle-item">
              <span className="principle-icon">
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <span>
                <strong>Jahresrahmen</strong>
                <small>statt Tagesplan</small>
              </span>
            </div>
            <div className="principle-divider" aria-hidden="true" />
            <div className="principle-item">
              <span className="principle-icon">
                <Leaf size={19} aria-hidden="true" />
              </span>
              <span>
                <strong>Weniger Pflege</strong>
                <small>mehr Orientierung</small>
              </span>
            </div>
          </div>
        </div>

        <section className="access-card" aria-labelledby="access-title">
          <div className="access-card-heading">
            <span className="access-card-icon" aria-hidden="true">
              <LockKeyhole size={21} />
            </span>
            <div>
              <p className="overline">Klassenbereich</p>
              <h2 id="access-title">Zugang öffnen</h2>
            </div>
          </div>

          <form className="access-form" onSubmit={handleAccessSubmit} noValidate>
            <label className="field-label" htmlFor="access-code">
              Zugangscode
            </label>
            <div className="code-field-wrap">
              <input
                ref={accessCodeRef}
                id="access-code"
                className={`text-input code-input ${accessError ? "input-error" : ""}`}
                type={isAccessCodeVisible ? "text" : "password"}
                inputMode="text"
                enterKeyHint="go"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={128}
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value.toUpperCase());
                  if (accessError) setAccessError("");
                }}
                placeholder="Code eingeben"
                aria-invalid={Boolean(accessError)}
                aria-describedby={accessError ? "code-hint code-error" : "code-hint"}
              />
              <button
                className="code-visibility-toggle"
                type="button"
                onClick={() => setIsAccessCodeVisible((isVisible) => !isVisible)}
                aria-label={
                  isAccessCodeVisible
                    ? "Zugangscode verbergen"
                    : "Zugangscode anzeigen"
                }
                aria-pressed={isAccessCodeVisible}
                title={
                  isAccessCodeVisible
                    ? "Zugangscode verbergen"
                    : "Zugangscode anzeigen"
                }
              >
                {isAccessCodeVisible ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
              <span className="code-field-status">Serverprüfung</span>
            </div>
            <p className="field-hint" id="code-hint">
              Erst nach erfolgreicher Serverprüfung werden die Termine geladen.
            </p>
            {accessError && (
              <p className="error-text access-code-error" id="code-error" role="alert">
                {accessError}
              </p>
            )}

            <div className="access-actions">
              <button
                className="button button-primary button-wide"
                type="submit"
                disabled={isChecking}
              >
                {isChecking ? "Zugang wird geprüft …" : "Klassenbereich öffnen"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="prototype-warning" role="note">
            <ShieldAlert size={18} aria-hidden="true" />
            <p>
              <strong>Geschützter Zugang:</strong> Termine werden erst nach einer
              erfolgreichen Prüfung vom Server ausgeliefert.
            </p>
          </div>
        </section>
      </section>

      <footer className="access-footer">
        <span>Langfristige Termine</span>
        <span aria-hidden="true">•</span>
        <span>Kein Stundenplan</span>
        <span aria-hidden="true">•</span>
        <span>Ruhig und übersichtlich</span>
      </footer>
    </main>
  );
}

function AppHeader({
  view,
  onAccess,
}: {
  view: Exclude<AppView, "access">;
  onAccess: () => void;
}) {
  const roleLabel = view === "student" ? "Schüleransicht" : "Lehreransicht";
  const shortRoleLabel = view === "student" ? "Schüler" : "Lehrkraft";

  return (
    <header className="app-header">
      <button
        className="brand-button"
        type="button"
        onClick={onAccess}
        aria-label="Zur Zugangsansicht"
      >
        <Brand compact />
      </button>

      <span className="current-role" aria-label={`Aktive Rolle: ${roleLabel}`}>
        {view === "student" ? (
          <Users size={15} aria-hidden="true" />
        ) : (
          <LockKeyhole size={15} aria-hidden="true" />
        )}
        <span className="role-label-long">{roleLabel}</span>
        <span className="role-label-short" aria-hidden="true">
          {shortRoleLabel}
        </span>
      </span>

      <button
        className="exit-link"
        type="button"
        onClick={onAccess}
        aria-label="Zugang wechseln"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        <span>Zugang wechseln</span>
      </button>
    </header>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`category-badge category-${categoryClass[category]}`}>
      <span aria-hidden="true" />
      {category}
    </span>
  );
}

function EventOpenTarget({
  event,
  onSelect,
}: {
  event: CalendarEvent;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <button
      className="event-open-target"
      type="button"
      onClick={() => onSelect(event)}
      aria-label={`Details zu „${event.title}“ öffnen`}
    >
      <span className="visually-hidden">Details öffnen</span>
    </button>
  );
}

function CurrentPeriodCard({
  event,
  onSelect,
}: {
  event?: CalendarEvent;
  onSelect: (event: CalendarEvent) => void;
}) {
  const label =
    event?.category === "Achtklass-Stück" ? "Aktuelle Übungszeit" : "Aktuelle Epoche";

  return (
    <article
      className={`feature-card current-card ${event ? "event-is-openable" : ""}`}
    >
      <div className="feature-card-topline">
        <span className="feature-label">
          <BookOpen size={16} aria-hidden="true" />
          {label}
        </span>
        <span className="status-chip">Heute</span>
      </div>
      {event ? (
        <div className="feature-content populated">
          <CategoryBadge category={event.category} />
          <h2>{event.title}</h2>
          <p>{formatEventDate(event)}</p>
        </div>
      ) : (
        <div className="feature-content empty-feature">
          <span className="empty-symbol" aria-hidden="true">
            <Leaf size={24} />
          </span>
          <div>
            <h2>Noch keine Epoche eingetragen</h2>
            <p>Sobald eine Epoche angelegt ist, erscheint sie hier automatisch.</p>
          </div>
        </div>
      )}
      {event && <EventOpenTarget event={event} onSelect={onSelect} />}
    </article>
  );
}

function NextEventCard({
  event,
  onSelect,
}: {
  event?: CalendarEvent;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <article
      className={`feature-card next-card ${event ? "event-is-openable" : ""}`}
    >
      <div className="feature-card-topline">
        <span className="feature-label">
          <Flag size={16} aria-hidden="true" />
          Als Nächstes
        </span>
      </div>
      {event ? (
        <div className="feature-content populated">
          <CategoryBadge category={event.category} />
          <h2>{event.title}</h2>
          <p>
            {formatEventDate(event)}
            {event.time ? ` · ${event.time} Uhr` : ""}
          </p>
        </div>
      ) : (
        <div className="feature-content empty-feature">
          <span className="empty-symbol warm" aria-hidden="true">
            <Bell size={24} />
          </span>
          <div>
            <h2>Noch kein nächster Termin</h2>
            <p>Der nächste wichtige Klassentermin wird hier hervorgehoben.</p>
          </div>
        </div>
      )}
      {event && <EventOpenTarget event={event} onSelect={onSelect} />}
    </article>
  );
}

function UpcomingEvents({
  events,
  onSelect,
}: {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <section
      className="dashboard-section"
      id="termine"
      aria-labelledby="upcoming-title"
    >
      <div className="section-heading-row">
        <div>
          <p className="overline">Demnächst</p>
          <h2 id="upcoming-title">Nächste wichtige Termine</h2>
        </div>
        {events.length > 0 && (
          <span className="section-count">{events.length} eingetragen</span>
        )}
      </div>

      {events.length === 0 ? (
        <div className="empty-list-card compact-empty">
          <span className="empty-list-icon" aria-hidden="true">
            <Calendar size={24} />
          </span>
          <div>
            <h3>Noch keine Termine vorhanden</h3>
            <p>Wichtige bevorstehende Termine erscheinen hier in Reihenfolge.</p>
          </div>
        </div>
      ) : (
        <div className="upcoming-list">
          {events.slice(0, 3).map((event) => (
            <EventRow key={event.id} event={event} compact onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}

function EventRow({
  event,
  compact = false,
  onSelect,
  onEdit,
  onDelete,
  isDeleting = false,
}: {
  event: CalendarEvent;
  compact?: boolean;
  onSelect?: (event: CalendarEvent) => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  isDeleting?: boolean;
}) {
  const date = parseLocalDate(event.startDate);
  const day = new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("de-DE", { month: "short" })
    .format(date)
    .replace(".", "");

  return (
    <article
      className={`event-row ${compact ? "event-row-compact" : ""} ${onSelect ? "event-is-openable" : ""}`}
    >
      <div className="event-date-block" aria-label={formatDate(event.startDate)}>
        <strong>{day}</strong>
        <span>{month}</span>
      </div>
      <div className="event-row-main">
        <CategoryBadge category={event.category} />
        <h3>{event.title}</h3>
        <p className="event-meta">
          <span>
            <Calendar size={14} aria-hidden="true" />
            {formatEventDate(event)}
          </span>
          {event.time && (
            <span>
              <Clock3 size={14} aria-hidden="true" />
              {event.time} Uhr
            </span>
          )}
          <span>
            <Users size={14} aria-hidden="true" />
            {event.audience}
          </span>
        </p>
      </div>
      {!compact && !onEdit && !onDelete && (
        <span className="temporary-label">
          <Check size={13} aria-hidden="true" />
          gespeichert
        </span>
      )}
      {onEdit && onDelete && (
        <div
          className="event-actions"
          role="group"
          aria-label={`Aktionen für „${event.title}“`}
        >
          <button
            className="event-action-button"
            type="button"
            onClick={() => onEdit(event)}
            disabled={isDeleting}
            aria-label={`„${event.title}“ bearbeiten`}
          >
            <Pencil size={15} aria-hidden="true" />
            <span>Bearbeiten</span>
          </button>
          <button
            className="event-action-button event-action-delete"
            type="button"
            onClick={() => onDelete(event)}
            disabled={isDeleting}
            aria-label={`„${event.title}“ löschen`}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>{isDeleting ? "Wird gelöscht …" : "Löschen"}</span>
          </button>
        </div>
      )}
      {onSelect && <EventOpenTarget event={event} onSelect={onSelect} />}
    </article>
  );
}

function Timeline({
  events,
  onSelect,
  onOpenCalendar,
}: {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onOpenCalendar: () => void;
}) {
  return (
    <section className="timeline-card" aria-labelledby="timeline-title">
      <div className="section-heading-row timeline-heading">
        <div>
          <p className="overline">Im Jahreslauf</p>
          <h2 id="timeline-title">Chronologische Übersicht</h2>
        </div>
        <button
          className="timeline-calendar-button"
          type="button"
          onClick={onOpenCalendar}
          aria-label="Kalenderansicht öffnen"
        >
          <CalendarDays size={22} aria-hidden="true" />
        </button>
      </div>

      {events.length === 0 ? (
        <div className="timeline-empty">
          <div className="timeline-line" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h3>Die Zeitleiste ist noch leer</h3>
          <p>Alle eingetragenen Epochen und Termine werden später nach Datum sortiert.</p>
        </div>
      ) : (
        <div className="timeline-list">
          {events.map((event) => (
            <div className="timeline-entry event-is-openable" key={event.id}>
              <span
                className={`timeline-dot category-${categoryClass[event.category]}`}
                aria-hidden="true"
              />
              <div>
                <span>{formatEventDate(event)}</span>
                <strong>{event.title}</strong>
                <small>{event.category}</small>
              </div>
              <EventOpenTarget event={event} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const calendarWeekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

function CalendarOverview({
  events,
  onClose,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const [monthStart, setMonthStart] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const calendarDays = useMemo(() => {
    const mondayOffset = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      1 - mondayOffset,
    );
    return Array.from(
      { length: 42 },
      (_, index) =>
        new Date(
          gridStart.getFullYear(),
          gridStart.getMonth(),
          gridStart.getDate() + index,
        ),
    );
  }, [monthStart]);

  const eventsByDay = useMemo(() => {
    const result = new Map<string, CalendarEvent[]>();
    for (const day of calendarDays) {
      const key = dateKey(day);
      result.set(
        key,
        events.filter((event) => eventOccursOnDate(event, key)).sort(compareEvents),
      );
    }
    return result;
  }, [calendarDays, events]);

  const selectedDateKey = dateKey(selectedDate);
  const selectedEvents = eventsByDay.get(selectedDateKey) ??
    events.filter((event) => eventOccursOnDate(event, selectedDateKey)).sort(compareEvents);
  const monthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(monthStart);
  const selectedDateLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(selectedDate);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function moveMonth(offset: number) {
    const nextMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + offset,
      1,
    );
    const lastDay = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth() + 1,
      0,
    ).getDate();
    setMonthStart(nextMonth);
    setSelectedDate(
      new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        Math.min(selectedDate.getDate(), lastDay),
      ),
    );
  }

  function selectDay(day: Date) {
    setSelectedDate(day);
    if (
      day.getMonth() !== monthStart.getMonth() ||
      day.getFullYear() !== monthStart.getFullYear()
    ) {
      setMonthStart(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  }

  function showToday() {
    setMonthStart(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  return (
    <div className="modal-backdrop calendar-backdrop">
      <section
        className="calendar-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-title"
      >
        <header className="calendar-toolbar">
          <button className="calendar-today-button" type="button" onClick={showToday}>
            Heute
          </button>
          <div className="calendar-title-block">
            <p className="overline">Kalender</p>
            <h2 id="calendar-title">{monthLabel}</h2>
          </div>
          <div className="calendar-toolbar-actions">
            <div className="calendar-month-navigation" role="group" aria-label="Monat wechseln">
              <button type="button" onClick={() => moveMonth(-1)} aria-label="Vorheriger Monat">
                <ChevronLeft size={21} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => moveMonth(1)} aria-label="Nächster Monat">
                <ChevronRight size={21} aria-hidden="true" />
              </button>
            </div>
            <button
              ref={closeButtonRef}
              className="calendar-close-button"
              type="button"
              onClick={onClose}
              aria-label="Kalenderansicht schließen"
            >
              <X size={21} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="calendar-layout">
          <section className="calendar-month-panel" aria-label={monthLabel}>
            <div className="calendar-weekdays" aria-hidden="true">
              {calendarWeekdays.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="calendar-grid" role="grid" aria-labelledby="calendar-title">
              {calendarDays.map((day) => {
                const key = dateKey(day);
                const dayEvents = eventsByDay.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === monthStart.getMonth();
                const isToday = key === todayKey;
                const isSelected = key === selectedDateKey;
                const dateLabel = new Intl.DateTimeFormat("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(day);

                return (
                  <button
                    key={key}
                    className={`calendar-day ${isCurrentMonth ? "in-month" : "outside-month"} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
                    type="button"
                    role="gridcell"
                    onClick={() => selectDay(day)}
                    aria-label={`${dateLabel}${dayEvents.length > 0 ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "Termin" : "Termine"}` : ", keine Termine"}`}
                    aria-selected={isSelected}
                  >
                    <span className="calendar-day-number">{day.getDate()}</span>
                    <span className="calendar-day-events" aria-hidden="true">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          className={`calendar-event-pill category-${categoryClass[event.category]}`}
                          key={event.id}
                        >
                          {event.time ? `${event.time} ` : ""}
                          {event.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="calendar-more-events">+{dayEvents.length - 2} weitere</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="calendar-day-panel" aria-live="polite">
            <div className="calendar-day-heading">
              <span className={selectedDateKey === todayKey ? "is-today" : ""}>
                {selectedDate.getDate()}
              </span>
              <div>
                <p className="overline">
                  {selectedDateKey === todayKey ? "Heute" : "Ausgewählter Tag"}
                </p>
                <h3>{selectedDateLabel}</h3>
              </div>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="calendar-day-empty">
                <CalendarDays size={25} aria-hidden="true" />
                <p>Für diesen Tag sind keine Termine eingetragen.</p>
              </div>
            ) : (
              <div className="calendar-agenda">
                {selectedEvents.map((event) => (
                  <button
                    className="calendar-agenda-event"
                    type="button"
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    aria-label={`Details zu „${event.title}“ öffnen`}
                  >
                    <span
                      className={`calendar-agenda-marker category-${categoryClass[event.category]}`}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{event.title}</strong>
                      <small>
                        {event.time ? `${event.time} Uhr · ` : ""}
                        {event.category}
                      </small>
                    </span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function CategoryOverview({ events }: { events: CalendarEvent[] }) {
  return (
    <aside className="category-card" aria-labelledby="category-title">
      <div className="category-heading">
        <p className="overline">Bereiche</p>
        <h2 id="category-title">Alles an einem Ort</h2>
        <p>Die wichtigsten Teile des Klassenjahres bleiben klar getrennt.</p>
      </div>
      <ul className="category-list">
        {categories.map((category) => (
          <li key={category}>
            <span className={`category-marker category-${categoryClass[category]}`} />
            <span>{category}</span>
            <strong>{events.filter((event) => event.category === category).length}</strong>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function MobileStudentNav({
  activeSection,
  onNavigate,
}: {
  activeSection: StudentSection;
  onNavigate: (section: StudentSection) => void;
}) {
  const items: {
    section: StudentSection;
    label: string;
    icon: typeof BookOpen;
  }[] = [
    { section: "ueberblick", label: "Überblick", icon: BookOpen },
    { section: "termine", label: "Termine", icon: CalendarDays },
    { section: "jahresblick", label: "Jahresblick", icon: Compass },
  ];

  return (
    <nav className="mobile-tabbar" aria-label="Schnellnavigation">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.section;
        return (
          <button
            key={item.section}
            className={isActive ? "active" : ""}
            type="button"
            onClick={() => onNavigate(item.section)}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function EventDetails({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop detail-backdrop">
      <section
        className="event-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
      >
        <header className="detail-header">
          <div>
            <p className="overline">Termindetails</p>
            <CategoryBadge category={event.category} />
          </div>
          <button
            ref={closeButtonRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Detailansicht schließen"
          >
            <X size={21} aria-hidden="true" />
          </button>
        </header>

        <div className="detail-content">
          <div className="detail-title-block">
            <span>{eventTypeLabels[event.type]}</span>
            <h2 id="event-detail-title">{event.title}</h2>
          </div>

          <dl className="detail-facts">
            <div>
              <dt>
                <CalendarDays size={18} aria-hidden="true" />
                {event.type === "period" ? "Beginn" : "Datum"}
              </dt>
              <dd>{formatDate(event.startDate)}</dd>
            </div>
            {event.type === "period" && event.endDate && (
              <div>
                <dt>
                  <Calendar size={18} aria-hidden="true" />
                  Ende
                </dt>
                <dd>{formatDate(event.endDate)}</dd>
              </div>
            )}
            <div>
              <dt>
                <Clock3 size={18} aria-hidden="true" />
                Uhrzeit
              </dt>
              <dd>{event.time ? `${event.time} Uhr` : "Noch nicht angegeben"}</dd>
            </div>
            <div>
              <dt>
                <Users size={18} aria-hidden="true" />
                Für wen
              </dt>
              <dd>{event.audience}</dd>
            </div>
            <div className="detail-fact-wide">
              <dt>
                <MapPin size={18} aria-hidden="true" />
                Ort
              </dt>
              <dd>{event.location || "Noch nicht angegeben"}</dd>
            </div>
          </dl>

          <section className="detail-description" aria-labelledby="detail-description-title">
            <h3 id="detail-description-title">Weitere Informationen</h3>
            <p>{event.description || "Zu diesem Termin gibt es noch keine weiteren Informationen."}</p>
          </section>
        </div>

        <footer className="detail-footer">
          <button className="button button-primary" type="button" onClick={onClose}>
            Schließen
          </button>
        </footer>
      </section>
    </div>
  );
}

function StudentView({
  events,
  onAccess,
}: {
  events: CalendarEvent[];
  onAccess: () => void;
}) {
  const [activeSection, setActiveSection] = useState<StudentSection>("ueberblick");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const today = dateKey(new Date());
  const sortedEvents = useMemo(() => [...events].sort(compareEvents), [events]);
  const currentPeriod = sortedEvents.find(
    (event) =>
      event.type === "period" &&
      event.startDate <= today &&
      (event.endDate ?? event.startDate) >= today,
  );
  const upcomingEvents = sortedEvents.filter((event) => event.startDate >= today);
  const nextEvent = upcomingEvents.find((event) => event.id !== currentPeriod?.id);

  useEffect(() => {
    if (typeof document.getElementById !== "function") return;
    const sections = (["ueberblick", "termine", "jahresblick"] as const)
      .map((section) => ({ section, element: document.getElementById(section) }))
      .filter(
        (entry): entry is { section: StudentSection; element: HTMLElement } =>
          Boolean(entry.element),
      );
    if (sections.length === 0) return;

    const updateActiveSection = () => {
      const marker = (window.innerHeight || 800) * 0.28;
      let nextSection = sections[0].section;
      for (const entry of sections) {
        if (entry.element.getBoundingClientRect().top <= marker) {
          nextSection = entry.section;
        }
      }
      setActiveSection(nextSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  function navigateTo(section: StudentSection) {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="app-page student-page">
      <AppHeader view="student" onAccess={onAccess} />
      <main className="dashboard-shell">
        <section className="dashboard-intro" id="ueberblick">
          <div>
            <span className="eyebrow">Schüleransicht</span>
            <h1>Was im Klassenjahr wichtig ist.</h1>
          </div>
          <p>
            Epochen, Projekte und große Termine – ohne den Lärm eines täglichen
            Stundenplans.
          </p>
        </section>

        <div className="feature-grid">
          <CurrentPeriodCard event={currentPeriod} onSelect={setSelectedEvent} />
          <NextEventCard event={nextEvent} onSelect={setSelectedEvent} />
        </div>

        <UpcomingEvents events={upcomingEvents} onSelect={setSelectedEvent} />

        <div className="lower-dashboard-grid" id="jahresblick">
          <Timeline
            events={sortedEvents}
            onSelect={setSelectedEvent}
            onOpenCalendar={() => setIsCalendarOpen(true)}
          />
          <CategoryOverview events={events} />
        </div>
      </main>
      <PrototypeFooter />
      <MobileStudentNav activeSection={activeSection} onNavigate={navigateTo} />
      {isCalendarOpen && (
        <CalendarOverview
          events={sortedEvents}
          onClose={() => setIsCalendarOpen(false)}
          onSelectEvent={(event) => {
            setIsCalendarOpen(false);
            setSelectedEvent(event);
          }}
        />
      )}
      {selectedEvent && (
        <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
      )}
    </div>
  );
}

function TeacherView({
  events,
  onAccess,
  onAddClick,
  onEdit,
  onDelete,
  notice,
}: {
  events: CalendarEvent[];
  onAccess: () => void;
  onAddClick: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => Promise<void>;
  notice: string;
}) {
  const [filter, setFilter] = useState<"Alle" | Category>("Alle");
  const [deletingId, setDeletingId] = useState("");
  const [actionError, setActionError] = useState("");
  const visibleEvents = useMemo(
    () =>
      [...events]
        .filter((event) => filter === "Alle" || event.category === filter)
        .sort(compareEvents),
    [events, filter],
  );

  async function handleDelete(event: CalendarEvent) {
    if (!window.confirm(`„${event.title}“ wirklich löschen?`)) return;

    setDeletingId(event.id);
    setActionError("");
    try {
      await onDelete(event);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Der Termin konnte nicht gelöscht werden.",
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="app-page teacher-page">
      <AppHeader view="teacher" onAccess={onAccess} />
      <main className="teacher-shell">
        <section className="teacher-hero">
          <div>
            <span className="eyebrow">Lehreransicht</span>
            <h1>Jahresrahmen verwalten</h1>
            <p>
              Pflegen Sie nur die Termine, die der Klasse langfristig Orientierung
              geben. Alles Weitere bleibt bewusst draußen.
            </p>
          </div>
          <button className="button button-primary add-button" type="button" onClick={onAddClick}>
            <Plus size={19} aria-hidden="true" />
            Termin hinzufügen
          </button>
        </section>

        <div className="teacher-note" role="note">
          <span className="teacher-note-icon" aria-hidden="true">
            <Leaf size={20} />
          </span>
          <p>
            <strong>Wenig Pflege, viel Wirkung.</strong> Epochen, Meilensteine,
            Abgaben, Proben und Aufführungen genügen – kein täglicher Stundenplan.
          </p>
          <span className="session-note">Auf dem Server gespeichert</span>
        </div>

        {notice && (
          <div className="success-notice" role="status">
            <Check size={17} aria-hidden="true" />
            {notice}
          </div>
        )}

        {actionError && (
          <div className="action-error-notice" role="alert">
            <ShieldAlert size={17} aria-hidden="true" />
            {actionError}
          </div>
        )}

        <section className="event-management" aria-labelledby="event-list-title">
          <div className="management-heading">
            <div>
              <p className="overline">Jahresübersicht</p>
              <h2 id="event-list-title">Termine</h2>
            </div>
            <span className="event-total">
              {events.length} {events.length === 1 ? "Termin" : "Termine"}
            </span>
          </div>

          <div className="filter-bar" aria-label="Termine nach Bereich filtern">
            <span className="filter-label">
              <ListFilter size={16} aria-hidden="true" />
              Filtern
            </span>
            <div className="filter-scroll">
              {(["Alle", ...categories] as const).map((category) => (
                <button
                  key={category}
                  className={filter === category ? "active" : ""}
                  type="button"
                  onClick={() => setFilter(category)}
                  aria-pressed={filter === category}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {visibleEvents.length === 0 ? (
            <div className="admin-empty-state">
              <span className="admin-empty-icon" aria-hidden="true">
                <CalendarDays size={30} />
              </span>
              <h3>
                {events.length === 0
                  ? "Noch keine Termine eingetragen"
                  : "Keine Termine in diesem Bereich"}
              </h3>
              <p>
                {events.length === 0
                  ? "Beginnen Sie mit einer Epoche oder dem nächsten wichtigen Meilenstein."
                  : "Wählen Sie einen anderen Filter oder legen Sie einen neuen Termin an."}
              </p>
              <button className="button button-secondary" type="button" onClick={onAddClick}>
                <Plus size={17} aria-hidden="true" />
                Ersten Termin anlegen
              </button>
            </div>
          ) : (
            <div className="admin-event-list">
              {visibleEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  isDeleting={deletingId === event.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <PrototypeFooter />
    </div>
  );
}

type FormErrors = Partial<
  Record<"title" | "category" | "startDate" | "endDate" | "dateOrder", string>
>;

function EventTypeIcon({ type }: { type: EventType }) {
  if (type === "period") return <BookOpen size={20} aria-hidden="true" />;
  if (type === "milestone") return <Flag size={20} aria-hidden="true" />;
  if (type === "important") return <Calendar size={20} aria-hidden="true" />;
  return <Presentation size={20} aria-hidden="true" />;
}

function EventForm({
  initialEvent,
  onClose,
  onSave,
}: {
  initialEvent?: CalendarEvent;
  onClose: () => void;
  onSave: (event: NewCalendarEvent) => Promise<void>;
}) {
  const isEditing = Boolean(initialEvent);
  const [type, setType] = useState<EventType>(initialEvent?.type ?? "period");
  const [category, setCategory] = useState<Category>(initialEvent?.category ?? "Epochen");
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [startDate, setStartDate] = useState(initialEvent?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialEvent?.endDate ?? "");
  const [time, setTime] = useState(initialEvent?.time ?? "");
  const [audience, setAudience] = useState<Audience>(
    initialEvent?.audience ?? "Gesamte Klasse",
  );
  const [location, setLocation] = useState(initialEvent?.location ?? "");
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function selectType(nextType: EventType) {
    setType(nextType);
    setCategory(defaultCategory[nextType]);
    setErrors({});
    if (nextType !== "period") setEndDate("");
  }

  function validate() {
    const nextErrors: FormErrors = {};
    if (!title.trim()) nextErrors.title = "Bitte geben Sie einen Titel ein.";
    if (!category) nextErrors.category = "Bitte wählen Sie einen Bereich.";
    if (!startDate) {
      nextErrors.startDate =
        type === "period" ? "Bitte wählen Sie ein Startdatum." : "Bitte wählen Sie ein Datum.";
    }
    if (type === "period" && !endDate) {
      nextErrors.endDate = "Bitte wählen Sie ein Enddatum.";
    }
    if (type === "period" && startDate && endDate && endDate < startDate) {
      nextErrors.dateOrder = "Das Enddatum darf nicht vor dem Startdatum liegen.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) {
      if (!title.trim()) titleRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setSaveError("");
    try {
      await onSave({
        type,
        category,
        title: title.trim(),
        startDate,
        ...(type === "period" && endDate ? { endDate } : {}),
        ...(time ? { time } : {}),
        audience,
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Der Termin konnte nicht gespeichert werden.",
      );
      setIsSaving(false);
    }
  }

  const typeChoices: { type: EventType; hint: string }[] = [
    { type: "period", hint: "Start und Ende" },
    { type: "milestone", hint: "Abgabe oder Etappe" },
    { type: "important", hint: "Ein wichtiges Datum" },
    { type: "presentation", hint: "Probe, Präsentation, Aufführung" },
  ];

  return (
    <div className="modal-backdrop">
      <section
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <header className="modal-header">
          <div>
            <p className="overline">{isEditing ? "Eintrag bearbeiten" : "Neuer Eintrag"}</p>
            <h2 id="form-title">{isEditing ? "Termin bearbeiten" : "Termin hinzufügen"}</h2>
            <p>Pflichtfelder sind mit <span className="required">*</span> markiert.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Formular schließen">
            <X size={21} aria-hidden="true" />
          </button>
        </header>

        <form className="event-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="form-section type-section">
            <legend>
              Termin-Typ <span className="required">*</span>
            </legend>
            <div className="type-grid" role="radiogroup" aria-label="Termin-Typ">
              {typeChoices.map((choice) => (
                <button
                  key={choice.type}
                  className={`type-choice ${type === choice.type ? "selected" : ""}`}
                  type="button"
                  role="radio"
                  aria-checked={type === choice.type}
                  onClick={() => selectType(choice.type)}
                >
                  <span className="type-choice-icon">
                    <EventTypeIcon type={choice.type} />
                  </span>
                  <span>
                    <strong>{eventTypeLabels[choice.type]}</strong>
                    <small>{choice.hint}</small>
                  </span>
                  <span className="radio-indicator" aria-hidden="true">
                    {type === choice.type && <Check size={12} />}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="form-section details-section">
            <div className="form-field form-field-full">
              <label htmlFor="event-title">
                Titel <span className="required">*</span>
              </label>
              <input
                ref={titleRef}
                id="event-title"
                className={`text-input ${errors.title ? "input-error" : ""}`}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (errors.title) setErrors((current) => ({ ...current, title: undefined }));
                }}
                placeholder="Kurzer, eindeutiger Titel"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
              />
              {errors.title && <span className="error-text" id="title-error">{errors.title}</span>}
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="event-category">
                Bereich <span className="required">*</span>
              </label>
              <div className="select-wrap">
                <select
                  id="event-category"
                  className="text-input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as Category)}
                >
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </div>
            </div>

            {type === "period" ? (
              <div className="form-grid form-field-full date-grid">
                <div className="form-field">
                  <label htmlFor="start-date">
                    Startdatum <span className="required">*</span>
                  </label>
                  <input
                    id="start-date"
                    className={`text-input ${errors.startDate || errors.dateOrder ? "input-error" : ""}`}
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setErrors((current) => ({ ...current, startDate: undefined, dateOrder: undefined }));
                    }}
                    aria-invalid={Boolean(errors.startDate || errors.dateOrder)}
                  />
                  {errors.startDate && <span className="error-text">{errors.startDate}</span>}
                </div>
                <div className="form-field">
                  <label htmlFor="end-date">
                    Enddatum <span className="required">*</span>
                  </label>
                  <input
                    id="end-date"
                    className={`text-input ${errors.endDate || errors.dateOrder ? "input-error" : ""}`}
                    type="date"
                    min={startDate || undefined}
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setErrors((current) => ({ ...current, endDate: undefined, dateOrder: undefined }));
                    }}
                    aria-invalid={Boolean(errors.endDate || errors.dateOrder)}
                  />
                  {errors.endDate && <span className="error-text">{errors.endDate}</span>}
                </div>
                {errors.dateOrder && <span className="error-text date-order-error">{errors.dateOrder}</span>}
              </div>
            ) : (
              <div className="form-field form-field-full">
                <label htmlFor="single-date">
                  Datum <span className="required">*</span>
                </label>
                <input
                  id="single-date"
                  className={`text-input ${errors.startDate ? "input-error" : ""}`}
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setErrors((current) => ({ ...current, startDate: undefined }));
                  }}
                  aria-invalid={Boolean(errors.startDate)}
                />
                {errors.startDate && <span className="error-text">{errors.startDate}</span>}
              </div>
            )}

            <div className="form-grid form-field-full">
              <div className="form-field">
                <label htmlFor="event-time">
                  Uhrzeit <span className="optional">optional</span>
                </label>
                <input
                  id="event-time"
                  className="text-input"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="event-audience">
                  Zielgruppe <span className="optional">optional</span>
                </label>
                <div className="select-wrap">
                  <select
                    id="event-audience"
                    className="text-input"
                    value={audience}
                    onChange={(event) => setAudience(event.target.value as Audience)}
                  >
                    <option>Gesamte Klasse</option>
                    <option>Gruppe 1</option>
                    <option>Gruppe 2</option>
                    <option>Andere Gruppe</option>
                  </select>
                  <ChevronDown size={17} aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="event-location">
                Ort <span className="optional">optional</span>
              </label>
              <div className="input-with-icon">
                <MapPin size={17} aria-hidden="true" />
                <input
                  id="event-location"
                  className="text-input"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Ort eintragen"
                />
              </div>
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="event-description">
                Kurze Beschreibung <span className="optional">optional</span>
              </label>
              <textarea
                id="event-description"
                className="text-input textarea"
                rows={3}
                maxLength={240}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Nur das, was die Klasse wissen muss"
              />
              <span className="character-count">{description.length}/240</span>
            </div>
          </div>

          <footer className="form-footer">
            <p>
              <Sparkles size={14} aria-hidden="true" />
              Wird dauerhaft gespeichert und für die Klasse sichtbar
            </p>
            {saveError && (
              <p className="error-text form-save-error" role="alert">
                {saveError}
              </p>
            )}
            <div>
              <button
                className="button button-ghost"
                type="button"
                onClick={onClose}
                disabled={isSaving}
              >
                Abbrechen
              </button>
              <button className="button button-primary" type="submit" disabled={isSaving}>
                {isSaving
                  ? "Wird gespeichert …"
                  : isEditing
                    ? "Änderungen speichern"
                    : "Termin hinzufügen"}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}

function PrototypeFooter() {
  return (
    <footer className="prototype-footer">
      <PrototypeTag />
      <span>Termine werden dauerhaft auf dem Server gespeichert.</span>
    </footer>
  );
}

export default function KlassenkompassApp() {
  const [view, setView] = useState<AppView>("access");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent>();
  const [notice, setNotice] = useState("");

  function changeView(nextView: AppView) {
    setView(nextView);
    setNotice("");
    if (nextView === "access") {
      setSessionToken("");
      setEvents([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function authenticate(code: string) {
    const accessResponse = await fetch(apiUrl("/api/access"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!accessResponse.ok) {
      throw new Error(
        await apiError(accessResponse, "Dieser Zugangscode ist nicht gültig."),
      );
    }

    const session = (await accessResponse.json()) as {
      role: Exclude<AppView, "access">;
      token: string;
    };
    const eventsResponse = await fetch(apiUrl("/api/events"), {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (!eventsResponse.ok) {
      throw new Error(
        await apiError(eventsResponse, "Die Termine konnten nicht geladen werden."),
      );
    }

    const body = (await eventsResponse.json()) as { events: CalendarEvent[] };
    setEvents(body.events);
    setSessionToken(session.token);
    changeView(session.role);
  }

  async function saveEvent(event: NewCalendarEvent) {
    const response = await fetch(apiUrl("/api/events"), {
      method: editingEvent ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editingEvent ? { id: editingEvent.id, ...event } : event),
    });
    if (!response.ok) {
      throw new Error(await apiError(response, "Der Termin konnte nicht gespeichert werden."));
    }

    const body = (await response.json()) as { event: CalendarEvent };
    setEvents((current) =>
      editingEvent
        ? current.map((entry) => (entry.id === body.event.id ? body.event : entry))
        : [...current, body.event],
    );
    setIsFormOpen(false);
    setEditingEvent(undefined);
    setView("teacher");
    setNotice(
      editingEvent
        ? `„${body.event.title}“ wurde aktualisiert.`
        : `„${body.event.title}“ wurde dauerhaft gespeichert.`,
    );
  }

  async function deleteEvent(event: CalendarEvent) {
    setNotice("");
    const response = await fetch(apiUrl("/api/events"), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: event.id }),
    });
    if (!response.ok) {
      throw new Error(await apiError(response, "Der Termin konnte nicht gelöscht werden."));
    }

    setEvents((current) => current.filter((entry) => entry.id !== event.id));
    setNotice(`„${event.title}“ wurde gelöscht.`);
  }

  function closeEventForm() {
    setIsFormOpen(false);
    setEditingEvent(undefined);
  }

  async function leaveAccess() {
    const token = sessionToken;
    changeView("access");
    if (!token) return;

    try {
      await fetch(apiUrl("/api/access"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // The local token is gone; the server session also expires automatically.
    }
  }

  return (
    <>
      {view === "access" && <AccessView onAuthenticate={authenticate} />}
      {view === "student" && (
        <StudentView events={events} onAccess={leaveAccess} />
      )}
      {view === "teacher" && (
        <TeacherView
          events={events}
          onAccess={leaveAccess}
          onAddClick={() => {
            setNotice("");
            setEditingEvent(undefined);
            setIsFormOpen(true);
          }}
          onEdit={(event) => {
            setNotice("");
            setEditingEvent(event);
            setIsFormOpen(true);
          }}
          onDelete={deleteEvent}
          notice={notice}
        />
      )}
      {isFormOpen && (
        <EventForm
          key={editingEvent?.id ?? "new-event"}
          initialEvent={editingEvent}
          onClose={closeEventForm}
          onSave={saveEvent}
        />
      )}
    </>
  );
}
