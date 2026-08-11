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
  CircleDot,
  Clock3,
  Compass,
  Flag,
  Leaf,
  ListFilter,
  LockKeyhole,
  MapPin,
  Plus,
  Presentation,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type AppView = "access" | "student" | "teacher";
type EventType = "period" | "milestone" | "important" | "presentation";
type Category =
  | "Epochen"
  | "Achtklass-Projekt"
  | "Achtklass-Stück"
  | "Abgaben"
  | "Präsentationen";
type Audience = "Gesamte Klasse" | "Gruppe 1" | "Gruppe 2" | "Andere Gruppe";

type CalendarEvent = {
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

const categories: Category[] = [
  "Epochen",
  "Achtklass-Projekt",
  "Achtklass-Stück",
  "Abgaben",
  "Präsentationen",
];

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

const prototypeAccessCodes = {
  S: "student",
  A: "teacher",
} as const satisfies Record<string, Exclude<AppView, "access">>;

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
      Frontend-Prototyp
    </span>
  );
}

function AccessView({ onOpen }: { onOpen: (view: AppView) => void }) {
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const accessCodeRef = useRef<HTMLInputElement>(null);

  function handleAccessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = accessCode.trim().toUpperCase();
    const targetView =
      prototypeAccessCodes[normalizedCode as keyof typeof prototypeAccessCodes];

    if (targetView) {
      setAccessError("");
      onOpen(targetView);
      return;
    }

    setAccessError(
      normalizedCode
        ? "Dieser Zugangscode ist nicht gültig."
        : "Bitte einen Zugangscode eingeben.",
    );
    accessCodeRef.current?.focus();
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
                type="text"
                inputMode="text"
                enterKeyHint="go"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value.toUpperCase());
                  if (accessError) setAccessError("");
                }}
                placeholder="Code eingeben"
                aria-invalid={Boolean(accessError)}
                aria-describedby={accessError ? "code-hint code-error" : "code-hint"}
              />
              <span className="code-field-status">Prototyp</span>
            </div>
            <p className="field-hint" id="code-hint">
              Der Code wird nur in dieser Testversion lokal im Browser geprüft.
            </p>
            {accessError && (
              <p className="error-text access-code-error" id="code-error" role="alert">
                {accessError}
              </p>
            )}

            <div className="access-actions">
              <button className="button button-primary button-wide" type="submit">
                Klassenbereich öffnen
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="prototype-warning" role="note">
            <ShieldAlert size={18} aria-hidden="true" />
            <p>
              <strong>Nur zur Vorschau:</strong> Die Codes trennen die Ansichten
              nur im Frontend. Das ist noch keine echte Anmeldung oder Sicherheit.
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

function CurrentPeriodCard({ event }: { event?: CalendarEvent }) {
  return (
    <article className="feature-card current-card">
      <div className="feature-card-topline">
        <span className="feature-label">
          <BookOpen size={16} aria-hidden="true" />
          Aktuelle Epoche
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
    </article>
  );
}

function NextEventCard({ event }: { event?: CalendarEvent }) {
  return (
    <article className="feature-card next-card">
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
    </article>
  );
}

function UpcomingEvents({ events }: { events: CalendarEvent[] }) {
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
            <EventRow key={event.id} event={event} compact />
          ))}
        </div>
      )}
    </section>
  );
}

function EventRow({
  event,
  compact = false,
}: {
  event: CalendarEvent;
  compact?: boolean;
}) {
  const date = parseLocalDate(event.startDate);
  const day = new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("de-DE", { month: "short" })
    .format(date)
    .replace(".", "");

  return (
    <article className={`event-row ${compact ? "event-row-compact" : ""}`}>
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
      {!compact && (
        <span className="temporary-label">
          <Sparkles size={13} aria-hidden="true" />
          nur temporär
        </span>
      )}
    </article>
  );
}

function Timeline({ events }: { events: CalendarEvent[] }) {
  return (
    <section className="timeline-card" aria-labelledby="timeline-title">
      <div className="section-heading-row timeline-heading">
        <div>
          <p className="overline">Im Jahreslauf</p>
          <h2 id="timeline-title">Chronologische Übersicht</h2>
        </div>
        <CalendarDays size={22} aria-hidden="true" />
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
            <div className="timeline-entry" key={event.id}>
              <span
                className={`timeline-dot category-${categoryClass[event.category]}`}
                aria-hidden="true"
              />
              <div>
                <span>{formatEventDate(event)}</span>
                <strong>{event.title}</strong>
                <small>{event.category}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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

function MobileStudentNav() {
  return (
    <nav className="mobile-tabbar" aria-label="Schnellnavigation">
      <a href="#ueberblick">
        <BookOpen size={20} aria-hidden="true" />
        <span>Überblick</span>
      </a>
      <a href="#termine">
        <CalendarDays size={20} aria-hidden="true" />
        <span>Termine</span>
      </a>
      <a href="#jahresblick">
        <Compass size={20} aria-hidden="true" />
        <span>Jahresblick</span>
      </a>
    </nav>
  );
}

function StudentView({
  events,
  onAccess,
}: {
  events: CalendarEvent[];
  onAccess: () => void;
}) {
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
          <CurrentPeriodCard event={currentPeriod} />
          <NextEventCard event={nextEvent} />
        </div>

        <UpcomingEvents events={upcomingEvents} />

        <div className="lower-dashboard-grid" id="jahresblick">
          <Timeline events={sortedEvents} />
          <CategoryOverview events={events} />
        </div>
      </main>
      <PrototypeFooter />
      <MobileStudentNav />
    </div>
  );
}

function TeacherView({
  events,
  onAccess,
  onAddClick,
  notice,
}: {
  events: CalendarEvent[];
  onAccess: () => void;
  onAddClick: () => void;
  notice: string;
}) {
  const [filter, setFilter] = useState<"Alle" | Category>("Alle");
  const visibleEvents = useMemo(
    () =>
      [...events]
        .filter((event) => filter === "Alle" || event.category === filter)
        .sort(compareEvents),
    [events, filter],
  );

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
          <span className="session-note">Nur für diese Sitzung</span>
        </div>

        {notice && (
          <div className="success-notice" role="status">
            <Check size={17} aria-hidden="true" />
            {notice}
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
                <EventRow key={event.id} event={event} />
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
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
}) {
  const [type, setType] = useState<EventType>("period");
  const [category, setCategory] = useState<Category>("Epochen");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [audience, setAudience] = useState<Audience>("Gesamte Klasse");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) {
      if (!title.trim()) titleRef.current?.focus();
      return;
    }

    onSave({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
            <p className="overline">Neuer Eintrag</p>
            <h2 id="form-title">Termin hinzufügen</h2>
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
              Wird nur vorübergehend angezeigt
            </p>
            <div>
              <button className="button button-ghost" type="button" onClick={onClose}>
                Abbrechen
              </button>
              <button className="button button-primary" type="submit">
                Termin hinzufügen
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
      <span>Keine Daten werden dauerhaft gespeichert.</span>
    </footer>
  );
}

export default function KlassenkompassApp() {
  const [view, setView] = useState<AppView>("access");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function changeView(nextView: AppView) {
    setView(nextView);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveEvent(event: CalendarEvent) {
    setEvents((current) => [...current, event]);
    setIsFormOpen(false);
    setView("teacher");
    setNotice(`„${event.title}“ wurde vorübergehend hinzugefügt.`);
  }

  return (
    <>
      {view === "access" && <AccessView onOpen={changeView} />}
      {view === "student" && (
        <StudentView events={events} onAccess={() => changeView("access")} />
      )}
      {view === "teacher" && (
        <TeacherView
          events={events}
          onAccess={() => changeView("access")}
          onAddClick={() => {
            setNotice("");
            setIsFormOpen(true);
          }}
          notice={notice}
        />
      )}
      {isFormOpen && <EventForm onClose={() => setIsFormOpen(false)} onSave={saveEvent} />}
    </>
  );
}
