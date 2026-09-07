"use client";

import {
  ChevronDown,
  Clock3,
  FileClock,
  History,
  RotateCcw,
  ShieldAlert,
  BadgeCheck,
} from "lucide-react";
import { useState } from "react";
import type { CalendarEventAuditLog } from "../lib/audit-logs";
import type { CalendarEvent } from "../lib/calendar-events";

const actionLabels: Record<CalendarEventAuditLog["action"], string> = {
  create: "Termin erstellt",
  update: "Termin bearbeitet",
  delete: "Termin gelöscht",
  restore: "Früheren Stand wiederhergestellt",
};

const eventTypeLabels: Record<CalendarEvent["type"], string> = {
  period: "Epoche / Zeitraum",
  milestone: "Abgabe oder Meilenstein",
  important: "Wichtiger Termin",
  presentation: "Probe oder Präsentation",
};

type AuditField = {
  key: Exclude<keyof CalendarEvent, "id">;
  label: string;
  format?: (value: string) => string;
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

const auditFields: AuditField[] = [
  { key: "title", label: "Titel" },
  {
    key: "type",
    label: "Terminart",
    format: (value) => eventTypeLabels[value as CalendarEvent["type"]] ?? value,
  },
  { key: "category", label: "Bereich" },
  { key: "startDate", label: "Start / Datum", format: formatDate },
  { key: "endDate", label: "Ende", format: formatDate },
  { key: "time", label: "Uhrzeit", format: (value) => `${value} Uhr` },
  { key: "audience", label: "Zielgruppe" },
  { key: "location", label: "Ort" },
  { key: "description", label: "Beschreibung" },
];

function fieldValue(event: CalendarEvent | null, field: AuditField) {
  if (!event) return "Nicht vorhanden";
  const value = event[field.key];
  if (typeof value !== "string" || !value) return "–";
  return field.format ? field.format(value) : value;
}

function changedFields(log: CalendarEventAuditLog) {
  return auditFields.filter(
    (field) =>
      fieldValue(log.beforeState, field) !== fieldValue(log.afterState, field),
  );
}

function eventTitle(log: CalendarEventAuditLog) {
  return log.afterState?.title ?? log.beforeState?.title ?? "Unbekannter Termin";
}

function formatAuditTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function AuditEntry({
  log,
  onRestore,
}: {
  log: CalendarEventAuditLog;
  onRestore: (log: CalendarEventAuditLog) => Promise<void>;
}) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const changedFieldKeys = new Set(changedFields(log).map((field) => field.key));

  async function handleRestore() {
    const consequence = log.beforeState
      ? `„${eventTitle(log)}“ wird auf den Stand unmittelbar vor dieser Änderung zurückgesetzt.`
      : `„${eventTitle(log)}“ existierte vor dieser Änderung nicht und wird deshalb entfernt.`;
    if (
      !window.confirm(
        `${consequence}\n\nDer aktuelle Zustand bleibt im Änderungsprotokoll erhalten. Fortfahren?`,
      )
    ) {
      return;
    }

    setIsRestoring(true);
    setRestoreError("");
    try {
      await onRestore(log);
    } catch (error) {
      setRestoreError(
        error instanceof Error
          ? error.message
          : "Der frühere Stand konnte nicht wiederhergestellt werden.",
      );
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <article className={`audit-entry audit-action-${log.action}`}>
      <div className="audit-entry-heading">
        <span className="audit-action-icon" aria-hidden="true">
          {log.action === "restore" ? <RotateCcw size={18} /> : <FileClock size={18} />}
        </span>
        <div className="audit-entry-title">
          <span className="audit-action-label">{actionLabels[log.action]}</span>
          <h3>{eventTitle(log)}</h3>
          <p className="audit-meta">
            <span>
              <BadgeCheck size={14} aria-hidden="true" />
              {log.actorEmail}
            </span>
            <span>
              <Clock3 size={14} aria-hidden="true" />
              {formatAuditTimestamp(log.changedAt)} Uhr
            </span>
          </p>
        </div>
      </div>

      <details className="audit-details">
        <summary>
          <span>
            <History size={16} aria-hidden="true" />
            Vorherigen Stand und Änderung ansehen
          </span>
          <ChevronDown size={17} aria-hidden="true" />
        </summary>
        <div className="audit-diff-scroll">
          <table className="audit-diff-table">
            <thead>
              <tr>
                <th scope="col">Feld</th>
                <th scope="col">Vorher</th>
                <th scope="col">Nachher</th>
              </tr>
            </thead>
            <tbody>
              {auditFields.map((field) => (
                <tr
                  key={field.key}
                  className={changedFieldKeys.has(field.key) ? "audit-field-changed" : ""}
                >
                  <th scope="row">
                    {field.label}
                    {changedFieldKeys.has(field.key) && (
                      <span className="audit-field-change-tag">geändert</span>
                    )}
                  </th>
                  <td>{fieldValue(log.beforeState, field)}</td>
                  <td>{fieldValue(log.afterState, field)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {restoreError && (
        <p className="audit-restore-error" role="alert">
          <ShieldAlert size={15} aria-hidden="true" />
          {restoreError}
        </p>
      )}

      <div className="audit-entry-footer">
        <p>Die Wiederherstellung wird als neue Änderung protokolliert.</p>
        <button
          className="button button-secondary audit-restore-button"
          type="button"
          onClick={handleRestore}
          disabled={isRestoring}
        >
          <RotateCcw size={16} aria-hidden="true" />
          {isRestoring ? "Wird wiederhergestellt …" : "Stand davor wiederherstellen"}
        </button>
      </div>
    </article>
  );
}

export default function AuditLogView({
  logs,
  hasMore,
  isLoading,
  error,
  onRestore,
  onLoadMore,
}: {
  logs: CalendarEventAuditLog[];
  hasMore: boolean;
  isLoading: boolean;
  error: string;
  onRestore: (log: CalendarEventAuditLog) => Promise<void>;
  onLoadMore: () => Promise<void>;
}) {
  return (
    <section className="audit-log" aria-labelledby="audit-log-title">
      <div className="management-heading audit-log-heading">
        <div>
          <p className="overline">Nachvollziehbare Verwaltung</p>
          <h2 id="audit-log-title">Änderungsprotokoll</h2>
        </div>
        <span className="event-total">
          {logs.length} {logs.length === 1 ? "Eintrag" : "Einträge"}
        </span>
      </div>

      <div className="audit-explanation" role="note">
        <History size={19} aria-hidden="true" />
        <p>
          Jede Änderung zeigt Zugangskennung, Datum, Uhrzeit sowie den Stand
          davor und danach. Beim vorübergehenden Passwortzugang ist keine
          persönliche Zuordnung möglich. Frühere Stände lassen sich kontrolliert
          zurückholen.
        </p>
      </div>

      {error && (
        <div className="action-error-notice audit-error" role="alert">
          <ShieldAlert size={17} aria-hidden="true" />
          {error}
        </div>
      )}

      {logs.length === 0 && !isLoading ? (
        <div className="audit-empty-state">
          <span aria-hidden="true">
            <History size={28} />
          </span>
          <h3>Noch keine Änderungen protokolliert</h3>
          <p>Neue Terminänderungen erscheinen ab jetzt automatisch hier.</p>
        </div>
      ) : (
        <div className="audit-list">
          {logs.map((log) => (
            <AuditEntry key={log.id} log={log} onRestore={onRestore} />
          ))}
        </div>
      )}

      {(hasMore || (isLoading && logs.length > 0)) && (
        <div className="audit-load-more">
          <button
            className="button button-secondary"
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Ältere Einträge werden geladen …" : "Ältere Einträge laden"}
          </button>
        </div>
      )}

      {isLoading && logs.length === 0 && (
        <p className="audit-loading" role="status">
          Änderungsprotokoll wird geladen …
        </p>
      )}
    </section>
  );
}
