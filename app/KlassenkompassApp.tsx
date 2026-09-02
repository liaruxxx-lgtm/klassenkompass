"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
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
  History,
  Leaf,
  ListFilter,
  LockKeyhole,
  Mail,
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
import AuditLogView from "./AuditLogView";
import type { CalendarEventAuditLog } from "../lib/audit-logs";
import {
  categories,
  type Audience,
  type CalendarEvent,
  type Category,
  type EventType,
  type NewCalendarEvent,
} from "../lib/calendar-events";
import {
  getTimetableEntries,
  timetableDays,
  timetableRows,
  type TimetableDayKey,
} from "../lib/timetable";

type AppView = "access" | "student" | "teacher";
type StudentSection = "ueberblick" | "termine" | "jahresblick";
type StudentMode = "year" | "timetable";

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
  onStudentAuthenticate,
  onRequestAdminCode,
  onVerifyAdminCode,
}: {
  onStudentAuthenticate: (code: string) => Promise<void>;
  onRequestAdminCode: (
    email: string,
  ) => Promise<{ challengeId: string; message: string }>;
  onVerifyAdminCode: (
    email: string,
    challengeId: string,
    code: string,
  ) => Promise<void>;
}) {
  const [accessMode, setAccessMode] = useState<"student" | "admin">("student");
  const [accessCode, setAccessCode] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminChallengeId, setAdminChallengeId] = useState("");
  const [adminVerificationCode, setAdminVerificationCode] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [accessError, setAccessError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAccessCodeVisible, setIsAccessCodeVisible] = useState(false);
  const accessCodeRef = useRef<HTMLInputElement>(null);
  const adminEmailRef = useRef<HTMLInputElement>(null);
  const adminVerificationCodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (accessMode === "admin" && adminChallengeId) {
      adminVerificationCodeRef.current?.focus();
    }
  }, [accessMode, adminChallengeId]);

  useEffect(() => {
    const handleLocalModeShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, button, [contenteditable='true']")
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key !== "s" && key !== "d") return;

      event.preventDefault();
      setAccessMode(key === "s" ? "student" : "admin");
      setAccessError("");
      setAdminMessage("");
      requestAnimationFrame(() => {
        if (key === "s") accessCodeRef.current?.focus();
        else adminEmailRef.current?.focus();
      });
    };

    window.addEventListener("keydown", handleLocalModeShortcut);
    return () => window.removeEventListener("keydown", handleLocalModeShortcut);
  }, []);

  function switchAccessMode(mode: "student" | "admin") {
    setAccessMode(mode);
    setAccessError("");
    setAdminMessage("");
    requestAnimationFrame(() => {
      if (mode === "student") accessCodeRef.current?.focus();
      else adminEmailRef.current?.focus();
    });
  }

  async function handleStudentSubmit(event: FormEvent<HTMLFormElement>) {
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
      await onStudentAuthenticate(normalizedCode);
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

  async function handleAdminEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = adminEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setAccessError("Bitte geben Sie Ihre freigegebene E-Mail-Adresse ein.");
      adminEmailRef.current?.focus();
      return;
    }

    setIsChecking(true);
    setAccessError("");
    setAdminMessage("");
    try {
      const result = await onRequestAdminCode(normalizedEmail);
      setAdminEmail(normalizedEmail);
      setAdminChallengeId(result.challengeId);
      setAdminVerificationCode("");
      setAdminMessage(result.message);
    } catch (error) {
      setAccessError(
        error instanceof Error
          ? error.message
          : "Der Einmalcode konnte nicht angefordert werden.",
      );
      adminEmailRef.current?.focus();
    } finally {
      setIsChecking(false);
    }
  }

  async function handleAdminCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(adminVerificationCode)) {
      setAccessError("Bitte geben Sie den sechsstelligen Einmalcode ein.");
      adminVerificationCodeRef.current?.focus();
      return;
    }

    setIsChecking(true);
    setAccessError("");
    try {
      await onVerifyAdminCode(
        adminEmail,
        adminChallengeId,
        adminVerificationCode,
      );
    } catch (error) {
      setAccessError(
        error instanceof Error
          ? error.message
          : "Der Admin-Zugang konnte nicht geöffnet werden.",
      );
      adminVerificationCodeRef.current?.focus();
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
            Klassenkompass bündelt Epochen, Projekte, den aktuellen Stundenplan
            und große Termine – alles an einem Ort, ohne täglichen Pflegeaufwand.
          </p>

          <div className="principle-strip" aria-label="Produktprinzipien">
            <div className="principle-item">
              <span className="principle-icon">
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <span>
                <strong>Jahresrahmen</strong>
                <small>und Stundenplan</small>
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
              <h2 id="access-title">
                {accessMode === "student"
                  ? "Schülerzugang öffnen"
                  : "Admin sicher anmelden"}
              </h2>
            </div>
          </div>

          <div
            className="access-mode-tabs"
            role="tablist"
            aria-label="Zugangsart wählen"
          >
            <button
              id="student-access-tab"
              className={accessMode === "student" ? "active" : ""}
              type="button"
              role="tab"
              data-shortcut="S"
              aria-keyshortcuts="S"
              aria-selected={accessMode === "student"}
              aria-controls="student-access-panel"
              onClick={() => switchAccessMode("student")}
            >
              <Users size={16} aria-hidden="true" />
              Schüler
            </button>
            <button
              id="admin-access-tab"
              className={accessMode === "admin" ? "active" : ""}
              type="button"
              role="tab"
              data-shortcut="D"
              aria-keyshortcuts="D"
              aria-selected={accessMode === "admin"}
              aria-controls="admin-access-panel"
              onClick={() => switchAccessMode("admin")}
            >
              <Mail size={16} aria-hidden="true" />
              Admin
            </button>
          </div>

          {accessMode === "student" ? (
            <form
              id="student-access-panel"
              className="access-form"
              role="tabpanel"
              aria-labelledby="student-access-tab"
              onSubmit={handleStudentSubmit}
              noValidate
            >
              <div className="code-field-label">
                <label className="field-label" htmlFor="access-code">
                  Klassencode
                </label>
                <span className="code-field-status">Serverprüfung</span>
              </div>
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
                  placeholder="Klassencode eingeben"
                  aria-invalid={Boolean(accessError)}
                  aria-describedby={
                    accessError ? "student-code-hint access-error" : "student-code-hint"
                  }
                />
                <button
                  className="code-visibility-toggle"
                  type="button"
                  onClick={() => setIsAccessCodeVisible((isVisible) => !isVisible)}
                  aria-label={
                    isAccessCodeVisible
                      ? "Klassencode verbergen"
                      : "Klassencode anzeigen"
                  }
                  aria-pressed={isAccessCodeVisible}
                  title={
                    isAccessCodeVisible
                      ? "Klassencode verbergen"
                      : "Klassencode anzeigen"
                  }
                >
                  {isAccessCodeVisible ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="field-hint" id="student-code-hint">
                Schüler benötigen nur den gemeinsamen Klassencode – keinen Namen
                und keine E-Mail-Adresse.
              </p>

              {accessError && (
                <p className="error-text access-code-error" id="access-error" role="alert">
                  {accessError}
                </p>
              )}

              <div className="access-actions">
                <button
                  className="button button-primary button-wide"
                  type="submit"
                  disabled={isChecking}
                >
                  {isChecking ? "Zugang wird geprüft …" : "Schülerbereich öffnen"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
          ) : adminChallengeId ? (
            <form
              id="admin-access-panel"
              className="access-form admin-code-form"
              role="tabpanel"
              aria-labelledby="admin-access-tab"
              onSubmit={handleAdminCodeSubmit}
              noValidate
            >
              <div className="admin-email-confirmation" role="status">
                <BadgeCheck size={18} aria-hidden="true" />
                <span>
                  Code angefordert für <strong>{adminEmail}</strong>
                </span>
              </div>
              {adminMessage && <p className="field-hint">{adminMessage}</p>}
              <label className="field-label" htmlFor="admin-verification-code">
                Sechsstelliger Einmalcode
              </label>
              <input
                ref={adminVerificationCodeRef}
                id="admin-verification-code"
                className={`text-input admin-verification-input ${accessError ? "input-error" : ""}`}
                type="text"
                inputMode="numeric"
                enterKeyHint="go"
                autoComplete="one-time-code"
                spellCheck={false}
                maxLength={6}
                value={adminVerificationCode}
                onChange={(event) => {
                  setAdminVerificationCode(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  );
                  if (accessError) setAccessError("");
                }}
                placeholder="000000"
                aria-invalid={Boolean(accessError)}
                aria-describedby={accessError ? "admin-code-hint access-error" : "admin-code-hint"}
              />
              <p className="field-hint" id="admin-code-hint">
                Der Code ist zehn Minuten gültig und kann nur einmal verwendet
                werden.
              </p>

              {accessError && (
                <p className="error-text access-code-error" id="access-error" role="alert">
                  {accessError}
                </p>
              )}

              <div className="access-actions admin-code-actions">
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={isChecking}
                  onClick={() => {
                    setAdminChallengeId("");
                    setAdminVerificationCode("");
                    setAdminMessage("");
                    setAccessError("");
                    requestAnimationFrame(() => adminEmailRef.current?.focus());
                  }}
                >
                  Andere Adresse
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={isChecking}
                >
                  {isChecking ? "Code wird geprüft …" : "Admin-Ansicht öffnen"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
          ) : (
            <form
              id="admin-access-panel"
              className="access-form"
              role="tabpanel"
              aria-labelledby="admin-access-tab"
              onSubmit={handleAdminEmailSubmit}
              noValidate
            >
              <label className="field-label" htmlFor="admin-email">
                Freigegebene Admin-E-Mail-Adresse
              </label>
              <div className="admin-email-field-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  ref={adminEmailRef}
                  id="admin-email"
                  className={`text-input ${accessError ? "input-error" : ""}`}
                  type="email"
                  inputMode="email"
                  enterKeyHint="send"
                  autoCapitalize="none"
                  autoComplete="email"
                  spellCheck={false}
                  maxLength={254}
                  value={adminEmail}
                  onChange={(event) => {
                    setAdminEmail(event.target.value);
                    if (accessError) setAccessError("");
                  }}
                  placeholder="name@schule.de"
                  aria-invalid={Boolean(accessError)}
                  aria-describedby={accessError ? "admin-email-hint access-error" : "admin-email-hint"}
                />
              </div>
              <p className="field-hint" id="admin-email-hint">
                Es werden nur vorher freigegebene Adressen zugelassen. Der
                verifizierte Admin wird automatisch über diese Adresse im
                Protokoll ausgewiesen.
              </p>

              {accessError && (
                <p className="error-text access-code-error" id="access-error" role="alert">
                  {accessError}
                </p>
              )}

              <div className="access-actions">
                <button
                  className="button button-primary button-wide"
                  type="submit"
                  disabled={isChecking}
                >
                  {isChecking ? "Einmalcode wird gesendet …" : "Einmalcode senden"}
                  <Mail size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
          )}

          <div className="prototype-warning" role="note">
            <ShieldAlert size={18} aria-hidden="true" />
            <p>
              {accessMode === "student" ? (
                <>
                  <strong>Einfacher Schülerzugang:</strong> Der Klassencode reicht
                  zum Lesen der Termine und des Stundenplans.
                </>
              ) : (
                <>
                  <strong>Verifizierter Admin-Zugang:</strong> Kein frei
                  eingegebener Name und kein gemeinsames Admin-Passwort.
                </>
              )}
            </p>
          </div>
        </section>
      </section>

      <footer className="access-footer">
        <span>Langfristige Termine</span>
        <span aria-hidden="true">•</span>
        <span>Stundenplan inklusive</span>
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
  const roleLabel = view === "student" ? "Schüleransicht" : "Admin-Ansicht";
  const shortRoleLabel = view === "student" ? "Schüler" : "Admin";

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
  calendarButtonRef,
}: {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  onOpenCalendar: () => void;
  calendarButtonRef: { current: HTMLButtonElement | null };
}) {
  return (
    <section className="timeline-card" aria-labelledby="timeline-title">
      <div className="section-heading-row timeline-heading">
        <div>
          <p className="overline">Im Jahreslauf</p>
          <h2 id="timeline-title">Chronologische Übersicht</h2>
        </div>
        <button
          ref={calendarButtonRef}
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
  isActive,
  onClose,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  isActive: boolean;
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
    if (!isActive) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, onClose]);

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
    <div
      className="calendar-backdrop calendar-swap-view"
      aria-hidden={!isActive}
      inert={!isActive}
    >
      <section
        className="calendar-modal"
        role={isActive ? "dialog" : undefined}
        aria-modal={isActive ? false : undefined}
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
              <ArrowLeft size={19} aria-hidden="true" />
              <span>Chronologie</span>
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

function StudentModeSwitcher({
  mode,
  onChange,
}: {
  mode: StudentMode;
  onChange: (mode: StudentMode) => void;
}) {
  return (
    <div className="student-mode-switcher" role="tablist" aria-label="Schülerbereich wählen">
      <button
        id="student-mode-year"
        className={mode === "year" ? "active" : ""}
        type="button"
        role="tab"
        aria-selected={mode === "year"}
        aria-controls="student-year-panel"
        onClick={() => onChange("year")}
      >
        <CalendarDays size={17} aria-hidden="true" />
        Klassenjahr
      </button>
      <button
        id="student-mode-timetable"
        className={mode === "timetable" ? "active" : ""}
        type="button"
        role="tab"
        aria-selected={mode === "timetable"}
        aria-controls="student-timetable-panel"
        onClick={() => onChange("timetable")}
      >
        <Clock3 size={17} aria-hidden="true" />
        Stundenplan
      </button>
    </div>
  );
}

function TimetableLessonCell({
  dayKey,
  lessonNumber,
}: {
  dayKey: TimetableDayKey;
  lessonNumber: number;
}) {
  const entries = getTimetableEntries(dayKey, lessonNumber);

  return (
    <div className={`timetable-lesson-card ${entries.length > 1 ? "is-split" : ""}`}>
      {entries.length === 0 ? (
        <span className="timetable-empty-lesson">Frei</span>
      ) : (
        entries.map((entry, index) => (
          <div
            className={`timetable-entry timetable-tone-${entry.tone}`}
            key={`${entry.group ?? "class"}-${entry.name}-${index}`}
          >
            <div className="timetable-entry-heading">
              <span className="timetable-entry-dot" aria-hidden="true" />
              <strong>{entry.name}</strong>
            </div>
            {entry.group && <span className="timetable-group">{entry.group}</span>}
            {entry.teacher && <small>{entry.teacher}</small>}
          </div>
        ))
      )}
    </div>
  );
}

function TimetableView() {
  const currentWeekday = new Date().getDay();
  const todayDayKey =
    currentWeekday >= 1 && currentWeekday <= 5
      ? timetableDays[currentWeekday - 1].key
      : undefined;
  const [selectedDay, setSelectedDay] = useState<TimetableDayKey>(todayDayKey ?? "mon");
  const selectedDayDetails = timetableDays.find((day) => day.key === selectedDay) ?? timetableDays[0];
  const selectedDayEnd = selectedDay === "tue" || selectedDay === "thu" ? "15:35" : "13:20";

  return (
    <section
      id="student-timetable-panel"
      className="timetable-view"
      role="tabpanel"
      aria-labelledby="student-mode-timetable"
    >
      <div className="timetable-heading">
        <div>
          <span className="eyebrow">Stundenplan-Modus</span>
          <h1 id="timetable-title">Dein Stundenplan</h1>
          <p>
            Dein Wochenplan mit Unterricht, Pausen und Gruppenfächern – klar
            gegliedert für jeden Schultag.
          </p>
        </div>
        <div className="timetable-summary" aria-label="Unterrichtszeiten">
          <div className="timetable-summary-card">
            <span>Schulbeginn</span>
            <strong>08:00</strong>
          </div>
          <div className="timetable-summary-card">
            <span>Mo / Mi / Fr</span>
            <strong>bis 13:20</strong>
          </div>
          <div className="timetable-summary-card">
            <span>Di / Do</span>
            <strong>bis 15:35</strong>
          </div>
        </div>
      </div>

      <div className="timetable-day-tabs" role="tablist" aria-label="Wochentag wählen">
        {timetableDays.map((day) => {
          const isSelected = selectedDay === day.key;
          const isToday = todayDayKey === day.key;
          return (
            <button
              key={day.key}
              id={`timetable-day-${day.key}`}
              className={isSelected ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls="timetable-mobile-day"
              onClick={() => setSelectedDay(day.key)}
            >
              <span>{day.short}</span>
              <strong>{day.label}</strong>
              {isToday && <small>Heute</small>}
            </button>
          );
        })}
      </div>

      <div
        id="timetable-mobile-day"
        className="timetable-mobile-day"
        role="tabpanel"
        aria-labelledby={`timetable-day-${selectedDay}`}
      >
        <div className="timetable-mobile-heading">
          <div>
            <p className="overline">Tagesplan</p>
            <h2>{selectedDayDetails.label}</h2>
          </div>
          <span>Bis {selectedDayEnd} Uhr</span>
        </div>
        <ol className="timetable-mobile-list" aria-label={`Stundenplan für ${selectedDayDetails.label}`}>
          {timetableRows.map((row) =>
            row.type === "break" ? (
              <li className="timetable-mobile-break" key={`${selectedDay}-break-${row.label}`}>
                <span>{row.label}</span>
                <strong>
                  {row.start} – {row.end} · {row.duration} Min.
                </strong>
              </li>
            ) : (
              <li className="timetable-mobile-lesson" key={`${selectedDay}-lesson-${row.number}`}>
                <div className="timetable-mobile-time">
                  <strong>{row.number}</strong>
                  <span>{row.label}</span>
                  <small>
                    {row.start} – {row.end}
                  </small>
                </div>
                <TimetableLessonCell dayKey={selectedDay} lessonNumber={row.number} />
              </li>
            ),
          )}
        </ol>
      </div>

      <div className="timetable-table-wrap">
        <table className="timetable-table">
          <caption className="visually-hidden">
            Stundenplan Montag bis Freitag mit Unterrichtszeiten und Pausen
          </caption>
          <thead>
            <tr>
              <th scope="col">Zeit</th>
              {timetableDays.map((day) => (
                <th
                  className={todayDayKey === day.key ? "is-today" : ""}
                  scope="col"
                  key={day.key}
                >
                  <span>{day.short}</span>
                  <strong>{day.label}</strong>
                  {todayDayKey === day.key && <small>Heute</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timetableRows.map((row) =>
              row.type === "break" ? (
                <tr className="timetable-break-row" key={`break-${row.label}`}>
                  <th scope="row">
                    <strong>{row.label}</strong>
                    <span>
                      {row.start} – {row.end}
                    </span>
                  </th>
                  {timetableDays.map((day) => (
                    <td key={`${day.key}-${row.label}`}>
                      <span>{row.duration} Min. Pause</span>
                    </td>
                  ))}
                </tr>
              ) : (
                <tr key={`lesson-${row.number}`}>
                  <th scope="row">
                    <strong>{row.label}</strong>
                    <span>
                      {row.start} – {row.end}
                    </span>
                  </th>
                  {timetableDays.map((day) => (
                    <td key={`${day.key}-${row.number}`}>
                      <TimetableLessonCell dayKey={day.key} lessonNumber={row.number} />
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <p className="timetable-note">
        <Clock3 size={15} aria-hidden="true" />
        Unterrichtszeiten und Fächer entsprechen dem aktuellen Klassenplan.
      </p>
    </section>
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
  const [studentMode, setStudentMode] = useState<StudentMode>("year");
  const [activeSection, setActiveSection] = useState<StudentSection>("ueberblick");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const timelineCalendarButtonRef = useRef<HTMLButtonElement>(null);
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
    if (studentMode !== "year") return;
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
  }, [studentMode]);

  function changeStudentMode(mode: StudentMode) {
    setStudentMode(mode);
    setSelectedEvent(undefined);
    setIsCalendarOpen(false);
    setActiveSection("ueberblick");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateTo(section: StudentSection) {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function closeCalendar() {
    setIsCalendarOpen(false);
  }

  return (
    <div className={`app-page student-page ${studentMode === "timetable" ? "student-page-timetable" : ""}`}>
      <AppHeader view="student" onAccess={onAccess} />
      <main className="dashboard-shell">
        <StudentModeSwitcher mode={studentMode} onChange={changeStudentMode} />
        {studentMode === "timetable" ? (
          <TimetableView />
        ) : (
          <div id="student-year-panel" role="tabpanel" aria-labelledby="student-mode-year">
            <section className="dashboard-intro" id="ueberblick">
              <div>
                <span className="eyebrow">Schüleransicht</span>
                <h1>Was im Klassenjahr wichtig ist.</h1>
              </div>
              <p>
                Epochen, Projekte, wichtige Termine und dein aktueller Stundenplan
                – alles an einem Ort.
              </p>
            </section>

            <div className="feature-grid">
              <CurrentPeriodCard event={currentPeriod} onSelect={setSelectedEvent} />
              <NextEventCard event={nextEvent} onSelect={setSelectedEvent} />
            </div>

            <UpcomingEvents events={upcomingEvents} onSelect={setSelectedEvent} />

            <div className="lower-dashboard-grid" id="jahresblick">
              <div className={`timeline-swap-slot ${isCalendarOpen ? "is-calendar" : ""}`}>
                <div
                  className="timeline-swap-panel timeline-swap-panel-timeline"
                  aria-hidden={isCalendarOpen}
                  inert={isCalendarOpen}
                  onTransitionEnd={(event) => {
                    if (
                      isCalendarOpen ||
                      event.target !== event.currentTarget ||
                      event.propertyName !== "transform"
                    ) {
                      return;
                    }
                    timelineCalendarButtonRef.current?.focus();
                  }}
                >
                  <Timeline
                    events={sortedEvents}
                    onSelect={setSelectedEvent}
                    onOpenCalendar={() => setIsCalendarOpen(true)}
                    calendarButtonRef={timelineCalendarButtonRef}
                  />
                </div>
                <div
                  className="timeline-swap-panel timeline-swap-panel-calendar"
                  aria-hidden={!isCalendarOpen}
                  inert={!isCalendarOpen}
                >
                  <CalendarOverview
                    events={sortedEvents}
                    isActive={isCalendarOpen}
                    onClose={closeCalendar}
                    onSelectEvent={(event) => {
                      setIsCalendarOpen(false);
                      setSelectedEvent(event);
                    }}
                  />
                </div>
              </div>
              <CategoryOverview events={events} />
            </div>
          </div>
        )}
      </main>
      <PrototypeFooter />
      {studentMode === "year" && (
        <MobileStudentNav activeSection={activeSection} onNavigate={navigateTo} />
      )}
      {selectedEvent && (
        <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
      )}
    </div>
  );
}

function TeacherView({
  events,
  actorEmail,
  auditLogs,
  auditHasMore,
  isAuditLoading,
  auditError,
  onAccess,
  onAddClick,
  onEdit,
  onDelete,
  onRestore,
  onLoadMoreAuditLogs,
  notice,
}: {
  events: CalendarEvent[];
  actorEmail: string;
  auditLogs: CalendarEventAuditLog[];
  auditHasMore: boolean;
  isAuditLoading: boolean;
  auditError: string;
  onAccess: () => void;
  onAddClick: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => Promise<void>;
  onRestore: (log: CalendarEventAuditLog) => Promise<void>;
  onLoadMoreAuditLogs: () => Promise<void>;
  notice: string;
}) {
  const [activePanel, setActivePanel] = useState<"events" | "audit">("events");
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
            <span className="eyebrow">Admin-Ansicht</span>
            <h1>Jahresrahmen verwalten</h1>
            <p>
              Pflegen Sie nur die Termine, die der Klasse langfristig Orientierung
              geben. Alles Weitere bleibt bewusst draußen.
            </p>
          </div>
          <div className="teacher-hero-actions">
            <button
              className="button button-secondary audit-open-button"
              type="button"
              onClick={() => setActivePanel("audit")}
            >
              <History size={18} aria-hidden="true" />
              Änderungsprotokoll
            </button>
            <button
              className="button button-primary add-button"
              type="button"
              onClick={onAddClick}
            >
              <Plus size={19} aria-hidden="true" />
              Termin hinzufügen
            </button>
          </div>
        </section>

        <div className="teacher-note" role="note">
          <span className="teacher-note-icon" aria-hidden="true">
            <Leaf size={20} />
          </span>
          <p>
            <strong>Wenig Pflege, viel Wirkung.</strong> Epochen, Meilensteine,
            Abgaben, Proben und Aufführungen genügen – der Stundenplan liegt
            separat in der Schüleransicht.
          </p>
          <span className="session-note">
            <BadgeCheck size={14} aria-hidden="true" />
            Verifiziert: {actorEmail}
          </span>
        </div>

        <div className="teacher-section-tabs" role="tablist" aria-label="Admin-Bereiche">
          <button
            id="events-tab"
            className={activePanel === "events" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={activePanel === "events"}
            aria-controls="events-panel"
            onClick={() => setActivePanel("events")}
          >
            <CalendarDays size={17} aria-hidden="true" />
            Termine
            <span>{events.length}</span>
          </button>
          <button
            id="audit-tab"
            className={activePanel === "audit" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={activePanel === "audit"}
            aria-controls="audit-panel"
            onClick={() => setActivePanel("audit")}
          >
            <History size={17} aria-hidden="true" />
            Änderungsprotokoll
            <span>{auditLogs.length}</span>
          </button>
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

        {activePanel === "events" ? (
        <section
          id="events-panel"
          className="event-management"
          role="tabpanel"
          aria-labelledby="events-tab event-list-title"
        >
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
        ) : (
          <div
            id="audit-panel"
            className="audit-panel"
            role="tabpanel"
            aria-labelledby="audit-tab"
          >
            <AuditLogView
              logs={auditLogs}
              hasMore={auditHasMore}
              isLoading={isAuditLoading}
              error={auditError}
              onRestore={onRestore}
              onLoadMore={onLoadMoreAuditLogs}
            />
          </div>
        )}
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
  const [actorEmail, setActorEmail] = useState("");
  const [auditLogs, setAuditLogs] = useState<CalendarEventAuditLog[]>([]);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
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
      setActorEmail("");
      setAuditLogs([]);
      setAuditHasMore(false);
      setAuditError("");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function requestAuditLogs(token: string, offset: number) {
    const response = await fetch(apiUrl(`/api/audit-logs?offset=${offset}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(
        await apiError(response, "Das Änderungsprotokoll konnte nicht geladen werden."),
      );
    }
    return (await response.json()) as {
      logs: CalendarEventAuditLog[];
      hasMore: boolean;
    };
  }

  async function refreshAuditLogs(token = sessionToken) {
    if (!token) return;
    setIsAuditLoading(true);
    setAuditError("");
    try {
      const page = await requestAuditLogs(token, 0);
      setAuditLogs(page.logs);
      setAuditHasMore(page.hasMore);
    } catch (error) {
      setAuditError(
        error instanceof Error
          ? error.message
          : "Das Änderungsprotokoll konnte nicht geladen werden.",
      );
    } finally {
      setIsAuditLoading(false);
    }
  }

  async function loadMoreAuditLogs() {
    if (isAuditLoading || !auditHasMore || !sessionToken) return;
    setIsAuditLoading(true);
    setAuditError("");
    try {
      const page = await requestAuditLogs(sessionToken, auditLogs.length);
      setAuditLogs((current) => {
        const knownIds = new Set(current.map((log) => log.id));
        return [...current, ...page.logs.filter((log) => !knownIds.has(log.id))];
      });
      setAuditHasMore(page.hasMore);
    } catch (error) {
      setAuditError(
        error instanceof Error
          ? error.message
          : "Ältere Protokolleinträge konnten nicht geladen werden.",
      );
    } finally {
      setIsAuditLoading(false);
    }
  }

  async function openAuthenticatedSession(session: {
    role: "student" | "teacher";
    token: string;
    actorEmail?: string;
  }) {
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
    setActorEmail(session.actorEmail ?? "");
    if (session.role === "teacher") {
      await refreshAuditLogs(session.token);
    }
    changeView(session.role);
  }

  async function authenticateStudent(code: string) {
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
      role: "student";
      token: string;
    };
    await openAuthenticatedSession(session);
  }

  async function requestAdminCode(email: string) {
    const response = await fetch(apiUrl("/api/admin-auth/request"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      throw new Error(
        await apiError(response, "Der Einmalcode konnte nicht angefordert werden."),
      );
    }
    return (await response.json()) as { challengeId: string; message: string };
  }

  async function verifyAdminCode(
    email: string,
    challengeId: string,
    code: string,
  ) {
    const response = await fetch(apiUrl("/api/admin-auth/verify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, challengeId, code }),
    });
    if (!response.ok) {
      throw new Error(
        await apiError(response, "Der Einmalcode konnte nicht geprüft werden."),
      );
    }
    const session = (await response.json()) as {
      role: "teacher";
      token: string;
      actorEmail: string;
    };
    await openAuthenticatedSession(session);
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
    await refreshAuditLogs();
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
    await refreshAuditLogs();
  }

  async function restoreAuditLog(log: CalendarEventAuditLog) {
    setNotice("");
    const response = await fetch(apiUrl("/api/audit-logs/restore"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auditLogId: log.id }),
    });
    if (!response.ok) {
      throw new Error(
        await apiError(response, "Der frühere Stand konnte nicht wiederhergestellt werden."),
      );
    }

    const body = (await response.json()) as {
      eventId: string;
      event: CalendarEvent | null;
    };
    setEvents((current) => {
      if (!body.event) {
        return current.filter((event) => event.id !== body.eventId);
      }
      const restoredEvent = body.event;
      const exists = current.some((event) => event.id === restoredEvent.id);
      return exists
        ? current.map((event) =>
            event.id === restoredEvent.id ? restoredEvent : event,
          )
        : [...current, restoredEvent];
    });
    setNotice(
      body.event
        ? `Der frühere Stand von „${body.event.title}“ wurde wiederhergestellt.`
        : `Der Stand vor der Erstellung von „${log.afterState?.title ?? "dem Termin"}“ wurde wiederhergestellt.`,
    );
    await refreshAuditLogs();
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
      {view === "access" && (
        <AccessView
          onStudentAuthenticate={authenticateStudent}
          onRequestAdminCode={requestAdminCode}
          onVerifyAdminCode={verifyAdminCode}
        />
      )}
      {view === "student" && (
        <StudentView events={events} onAccess={leaveAccess} />
      )}
      {view === "teacher" && (
        <TeacherView
          events={events}
          actorEmail={actorEmail}
          auditLogs={auditLogs}
          auditHasMore={auditHasMore}
          isAuditLoading={isAuditLoading}
          auditError={auditError}
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
          onRestore={restoreAuditLog}
          onLoadMoreAuditLogs={loadMoreAuditLogs}
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
