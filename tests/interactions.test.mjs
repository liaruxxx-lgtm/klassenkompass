import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act, create } from "react-test-renderer";
import KlassenkompassApp from "../app/KlassenkompassApp.tsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(globalThis, "requestAnimationFrame", {
  configurable: true,
  value(callback) {
    callback();
    return 1;
  },
});

let lastScrolledSection = "";

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {},
    confirm() {
      return true;
    },
  },
});

Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: {
    body: {
      style: {
        overflow: "",
      },
    },
    getElementById(id) {
      return {
        getBoundingClientRect() {
          return { top: id === "ueberblick" ? 0 : 1000 };
        },
        scrollIntoView() {
          lastScrolledSection = id;
        },
      };
    },
  },
});

const persistedEvents = [];
const persistedAuditLogs = [];
let activeActorEmail = "";
let auditSequence = 0;
const studentTestCode = "STUDENT-TEST-CODE-ONLY";
const adminTestPassword = "ADMIN-TEST-PASSWORD-ONLY";
const adminActorLabel = "Admin (Passwortzugang)";

function recordAudit(action, beforeState, afterState, restoredFromLogId) {
  auditSequence += 1;
  const snapshot = (value) => (value ? structuredClone(value) : null);
  persistedAuditLogs.unshift({
    id: `audit-${auditSequence}`,
    eventId: afterState?.id ?? beforeState?.id,
    action,
    actorEmail: activeActorEmail,
    changedAt: new Date(Date.UTC(2099, 0, 1, 9, auditSequence)).toISOString(),
    beforeState: snapshot(beforeState),
    afterState: snapshot(afterState),
    ...(restoredFromLogId ? { restoredFromLogId } : {}),
  });
}

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: async (input, init = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";

    if (url.endsWith("/api/access") && method === "POST") {
      const { code, role = "student" } = JSON.parse(init.body);
      if (role === "teacher") {
        if (code !== adminTestPassword) {
          return Response.json(
            { error: "Dieses Admin-Passwort ist nicht gültig." },
            { status: 401 },
          );
        }
        activeActorEmail = adminActorLabel;
        return Response.json({
          role: "teacher",
          token: "server-token-teacher",
          actorEmail: adminActorLabel,
        });
      }
      if (code.toUpperCase() !== studentTestCode) {
        return Response.json(
          { error: "Dieser Zugangscode ist nicht gültig." },
          { status: 401 },
        );
      }
      activeActorEmail = "";
      return Response.json({ role: "student", token: "server-token-student" });
    }

    if (url.endsWith("/api/events") && method === "GET") {
      return Response.json({ events: [...persistedEvents] });
    }

    if (url.endsWith("/api/events") && method === "POST") {
      const event = {
        id: `server-event-${persistedEvents.length + 1}`,
        ...JSON.parse(init.body),
      };
      persistedEvents.push(event);
      recordAudit("create", null, event);
      return Response.json({ event }, { status: 201 });
    }

    if (url.endsWith("/api/events") && method === "PUT") {
      const event = JSON.parse(init.body);
      const index = persistedEvents.findIndex((entry) => entry.id === event.id);
      if (index < 0) {
        return Response.json({ error: "Der Termin wurde nicht gefunden." }, { status: 404 });
      }
      const previousEvent = structuredClone(persistedEvents[index]);
      persistedEvents[index] = event;
      recordAudit("update", previousEvent, event);
      return Response.json({ event });
    }

    if (url.endsWith("/api/events") && method === "DELETE") {
      const { id } = JSON.parse(init.body);
      const index = persistedEvents.findIndex((entry) => entry.id === id);
      if (index < 0) {
        return Response.json({ error: "Der Termin wurde nicht gefunden." }, { status: 404 });
      }
      const [deletedEvent] = persistedEvents.splice(index, 1);
      recordAudit("delete", deletedEvent, null);
      return Response.json({ id });
    }

    if (url.includes("/api/audit-logs?") && method === "GET") {
      const offset = Number(new URL(url, "http://localhost").searchParams.get("offset") ?? 0);
      return Response.json({
        logs: persistedAuditLogs.slice(offset, offset + 50),
        hasMore: persistedAuditLogs.length > offset + 50,
      });
    }

    if (url.endsWith("/api/audit-logs/restore") && method === "POST") {
      const { auditLogId } = JSON.parse(init.body);
      const sourceLog = persistedAuditLogs.find((log) => log.id === auditLogId);
      if (!sourceLog) {
        return Response.json(
          { error: "Der Protokolleintrag wurde nicht gefunden." },
          { status: 404 },
        );
      }
      const currentIndex = persistedEvents.findIndex(
        (event) => event.id === sourceLog.eventId,
      );
      const currentState =
        currentIndex >= 0 ? structuredClone(persistedEvents[currentIndex]) : null;
      const restoredState = sourceLog.beforeState
        ? structuredClone(sourceLog.beforeState)
        : null;
      if (restoredState) {
        if (currentIndex >= 0) persistedEvents[currentIndex] = restoredState;
        else persistedEvents.push(restoredState);
      } else if (currentIndex >= 0) {
        persistedEvents.splice(currentIndex, 1);
      }
      recordAudit("restore", currentState, restoredState, sourceLog.id);
      return Response.json({ eventId: sourceLog.eventId, event: restoredState });
    }

    return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  },
});

function textOf(node) {
  if (typeof node === "string") return node;
  return node.children.map(textOf).join("");
}

function pageText(renderer) {
  return textOf(renderer.root);
}

function findButton(root, label, { exact = false } = {}) {
  const button = root.findAllByType("button").find((candidate) => {
    const text = textOf(candidate).replace(/\s+/g, " ").trim();
    return exact ? text === label : text.includes(label);
  });

  assert.ok(button, `Schaltfläche „${label}“ wurde nicht gefunden.`);
  return button;
}

async function click(button) {
  await act(async () => {
    await button.props.onClick();
  });
}

async function change(input, value) {
  await act(async () => {
    input.props.onChange({ target: { value } });
  });
}

async function submit(renderer) {
  await act(async () => {
    await renderer.root.findByProps({ className: "event-form" }).props.onSubmit({
      preventDefault() {},
    });
  });
}

async function submitAccess(renderer) {
  await act(async () => {
    const form = renderer.root
      .findAllByType("form")
      .find((candidate) => candidate.props.className?.includes("access-form"));
    assert.ok(form, "Zugangsformular wurde nicht gefunden.");
    await form.props.onSubmit({ preventDefault() {} });
  });
}

test("loads, creates, edits, and deletes events through the shared server API", async () => {
  persistedEvents.length = 0;
  persistedAuditLogs.length = 0;
  activeActorEmail = "";
  auditSequence = 0;
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(KlassenkompassApp));
  });

  assert.match(pageText(renderer), /Schülerzugang öffnen/);
  assert.doesNotMatch(pageText(renderer), /Aktuelle Epoche/);
  assert.equal(renderer.root.findAllByProps({ className: "role-switch" }).length, 0);

  const accessCodeInput = renderer.root.findByProps({ id: "access-code" });
  assert.equal(accessCodeInput.props.type, "password");
  assert.equal(renderer.root.findAllByProps({ id: "actor-name" }).length, 0);
  assert.equal(renderer.root.findAllByProps({ id: "admin-email" }).length, 0);
  const showAccessCodeButton = renderer.root.findByProps({
    "aria-label": "Klassencode anzeigen",
  });
  assert.equal(showAccessCodeButton.props["aria-pressed"], false);
  await click(showAccessCodeButton);
  assert.equal(renderer.root.findByProps({ id: "access-code" }).props.type, "text");
  const hideAccessCodeButton = renderer.root.findByProps({
    "aria-label": "Klassencode verbergen",
  });
  assert.equal(hideAccessCodeButton.props["aria-pressed"], true);
  await click(hideAccessCodeButton);
  assert.equal(renderer.root.findByProps({ id: "access-code" }).props.type, "password");

  await submitAccess(renderer);
  assert.match(pageText(renderer), /Bitte einen Zugangscode eingeben/);

  await change(renderer.root.findByProps({ id: "access-code" }), "x");
  assert.equal(renderer.root.findByProps({ id: "access-code" }).props.value, "X");
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Dieser Zugangscode ist nicht gültig/);

  await change(renderer.root.findByProps({ id: "access-code" }), studentTestCode);
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Aktuelle Epoche/);
  assert.match(pageText(renderer), /Noch keine Epoche eingetragen/);
  assert.match(pageText(renderer), /Noch keine Termine vorhanden/);
  assert.match(pageText(renderer), /Chronologische Übersicht/);
  assert.match(pageText(renderer), /Schüleransicht/);

  await click(renderer.root.findByProps({ id: "student-mode-timetable" }));
  assert.equal(renderer.root.findByProps({ id: "student-mode-timetable" }).props["aria-selected"], true);
  assert.match(pageText(renderer), /Stundenplan-Modus/);
  assert.match(pageText(renderer), /Dein Stundenplan/);
  assert.match(pageText(renderer), /Mittagspause/);
  assert.match(pageText(renderer), /Gruppe 1/);
  assert.match(pageText(renderer), /Gruppe 2/);
  assert.match(pageText(renderer), /Eur/);
  assert.match(pageText(renderer), /Mus/);

  await click(renderer.root.findByProps({ id: "student-mode-year" }));
  assert.equal(renderer.root.findByProps({ id: "student-mode-year" }).props["aria-selected"], true);
  assert.match(pageText(renderer), /Aktuelle Epoche/);

  await click(renderer.root.findByProps({ "aria-label": "Kalenderansicht öffnen" }));
  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 1);
  assert.match(pageText(renderer), /Kalender/);
  assert.match(pageText(renderer), /Für diesen Tag sind keine Termine eingetragen/);
  assert.equal(renderer.root.findAllByProps({ role: "gridcell" }).length, 42);
  const initialMonth = textOf(renderer.root.findByProps({ id: "calendar-title" }));
  await click(renderer.root.findByProps({ "aria-label": "Nächster Monat" }));
  assert.notEqual(textOf(renderer.root.findByProps({ id: "calendar-title" })), initialMonth);
  await click(findButton(renderer.root, "Heute", { exact: true }));
  assert.equal(textOf(renderer.root.findByProps({ id: "calendar-title" })), initialMonth);
  await click(renderer.root.findByProps({ "aria-label": "Ansicht wechseln" }));
  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 0);

  await click(findButton(renderer.root, "Zugang wechseln", { exact: true }));
  await click(findButton(renderer.root, "Admin", { exact: true }));
  assert.equal(renderer.root.findAllByProps({ id: "access-code" }).length, 0);
  assert.equal(renderer.root.findByProps({ id: "admin-password" }).props.type, "password");
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Bitte das Admin-Passwort eingeben/);
  await change(renderer.root.findByProps({ id: "admin-password" }), "falsch");
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Admin-Passwort ist nicht gültig/);
  const showAdminPasswordButton = renderer.root.findByProps({
    "aria-label": "Admin-Passwort anzeigen",
  });
  await click(showAdminPasswordButton);
  assert.equal(renderer.root.findByProps({ id: "admin-password" }).props.type, "text");
  await click(renderer.root.findByProps({ "aria-label": "Admin-Passwort verbergen" }));
  assert.equal(renderer.root.findByProps({ id: "admin-password" }).props.type, "password");
  await change(
    renderer.root.findByProps({ id: "admin-password" }),
    adminTestPassword,
  );
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Jahresrahmen verwalten/);
  assert.match(pageText(renderer), /Noch keine Termine eingetragen/);
  assert.match(pageText(renderer), /Admin-Ansicht/);
  assert.match(pageText(renderer), /Angemeldet: Admin \(Passwortzugang\)/);

  await click(findButton(renderer.root, "Termin hinzufügen", { exact: true }));
  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 1);
  assert.equal(renderer.root.findAllByProps({ id: "start-date" }).length, 1);
  assert.equal(renderer.root.findAllByProps({ id: "end-date" }).length, 1);
  assert.equal(renderer.root.findAllByProps({ id: "event-time" }).length, 1);
  assert.equal(renderer.root.findAllByProps({ id: "event-location" }).length, 1);
  assert.equal(renderer.root.findAllByProps({ id: "event-description" }).length, 1);
  assert.deepEqual(
    renderer.root
      .findByProps({ id: "event-audience" })
      .findAllByType("option")
      .map(textOf),
    ["Gesamte Klasse", "Gruppe 1", "Gruppe 2", "Andere Gruppe"],
  );

  await change(renderer.root.findByProps({ id: "event-title" }), "Zeitraum");
  await change(renderer.root.findByProps({ id: "start-date" }), "2099-02-01");
  await change(renderer.root.findByProps({ id: "end-date" }), "2099-01-31");
  await submit(renderer);
  assert.match(pageText(renderer), /Das Enddatum darf nicht vor dem Startdatum liegen/);

  await click(renderer.root.findByProps({ "aria-label": "Formular schließen" }));
  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 0);

  await click(findButton(renderer.root, "Termin hinzufügen", { exact: true }));
  await click(findButton(renderer.root, "Wichtiger Termin"));
  assert.equal(renderer.root.findAllByProps({ id: "single-date" }).length, 1);
  assert.equal(renderer.root.findAllByProps({ id: "start-date" }).length, 0);
  assert.equal(renderer.root.findAllByProps({ id: "end-date" }).length, 0);

  await submit(renderer);
  assert.match(pageText(renderer), /Bitte geben Sie einen Titel ein/);
  assert.match(pageText(renderer), /Bitte wählen Sie ein Datum/);

  await change(renderer.root.findByProps({ id: "event-title" }), "Prüftermin");
  await change(renderer.root.findByProps({ id: "single-date" }), "2099-01-15");
  await change(renderer.root.findByProps({ id: "event-time" }), "10:30");
  await change(renderer.root.findByProps({ id: "event-location" }), "Großer Saal");
  await change(
    renderer.root.findByProps({ id: "event-description" }),
    "Bitte zehn Minuten früher da sein.",
  );
  await submit(renderer);

  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 0);
  assert.match(pageText(renderer), /Prüftermin/);
  assert.match(pageText(renderer), /gespeichert/i);
  assert.match(pageText(renderer), /10:30 Uhr/);

  await click(findButton(renderer.root, "Bearbeiten", { exact: true }));
  assert.match(pageText(renderer), /Termin bearbeiten/);
  assert.equal(renderer.root.findByProps({ id: "event-title" }).props.value, "Prüftermin");
  assert.equal(renderer.root.findByProps({ id: "event-location" }).props.value, "Großer Saal");
  await change(renderer.root.findByProps({ id: "event-title" }), "Bearbeiteter Prüftermin");
  await change(renderer.root.findByProps({ id: "event-location" }), "Kleiner Saal");
  await submit(renderer);

  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 0);
  assert.match(pageText(renderer), /Bearbeiteter Prüftermin/);
  assert.match(pageText(renderer), /wurde aktualisiert/);
  assert.equal(persistedEvents.length, 1);
  assert.equal(persistedEvents[0].id, "server-event-1");
  assert.equal(persistedEvents[0].location, "Kleiner Saal");

  await click(findButton(renderer.root, "Änderungsprotokoll", { exact: true }));
  const auditText = pageText(renderer);
  assert.match(auditText, /2 Einträge/);
  assert.match(auditText, /Admin \(Passwortzugang\)/);
  assert.match(auditText, /\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2} Uhr/);
  assert.match(auditText, /Termin bearbeitet/);
  assert.match(auditText, /Termin erstellt/);
  assert.match(auditText, /Vorherigen Stand und Änderung ansehen/);
  assert.match(auditText, /Vorher/);
  assert.match(auditText, /Nachher/);
  assert.match(auditText, /geändert/);
  assert.match(auditText, /Großer Saal/);
  assert.match(auditText, /Kleiner Saal/);
  await click(renderer.root.findByProps({ id: "events-tab" }));

  await click(findButton(renderer.root, "Zugang wechseln", { exact: true }));
  await change(renderer.root.findByProps({ id: "access-code" }), studentTestCode);
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Als Nächstes/);
  assert.match(pageText(renderer), /Bearbeiteter Prüftermin/);
  assert.match(pageText(renderer), /Chronologische Übersicht/);

  const mobileNav = renderer.root.findByProps({ className: "mobile-tabbar" });
  const mobileNavButtons = mobileNav.findAllByType("button");
  assert.deepEqual(mobileNavButtons.map(textOf), ["Überblick", "Termine", "Jahresblick"]);
  assert.equal(mobileNavButtons[0].props["aria-current"], "page");
  await click(mobileNavButtons[1]);
  assert.equal(lastScrolledSection, "termine");
  assert.equal(mobileNavButtons[1].props["aria-current"], "page");
  assert.equal(mobileNavButtons[0].props["aria-current"], undefined);

  const detailTargets = renderer.root.findAllByProps({
    "aria-label": "Details zu „Bearbeiteter Prüftermin“ öffnen",
  });
  assert.ok(detailTargets.length >= 2);
  await click(detailTargets[0]);
  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 1);
  assert.match(pageText(renderer), /Termindetails/);
  assert.match(pageText(renderer), /15. Januar 2099/);
  assert.match(pageText(renderer), /10:30 Uhr/);
  assert.match(pageText(renderer), /Kleiner Saal/);
  assert.match(pageText(renderer), /Bitte zehn Minuten früher da sein/);
  await click(renderer.root.findByProps({ "aria-label": "Detailansicht schließen" }));
  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 0);

  await act(async () => {
    renderer.unmount();
  });

  let freshRenderer;
  await act(async () => {
    freshRenderer = create(React.createElement(KlassenkompassApp));
  });
  assert.match(pageText(freshRenderer), /Schülerzugang öffnen/);
  assert.doesNotMatch(pageText(freshRenderer), /Bearbeiteter Prüftermin/);

  await change(freshRenderer.root.findByProps({ id: "access-code" }), studentTestCode);
  await submitAccess(freshRenderer);
  assert.match(pageText(freshRenderer), /Bearbeiteter Prüftermin/);

  await click(findButton(freshRenderer.root, "Zugang wechseln", { exact: true }));
  await click(findButton(freshRenderer.root, "Admin", { exact: true }));
  await change(
    freshRenderer.root.findByProps({ id: "admin-password" }),
    adminTestPassword,
  );
  await submitAccess(freshRenderer);

  await click(findButton(freshRenderer.root, "Änderungsprotokoll", { exact: true }));
  await click(findButton(freshRenderer.root, "Stand davor wiederherstellen", { exact: true }));
  assert.equal(persistedEvents.length, 1);
  assert.equal(persistedEvents[0].title, "Prüftermin");
  assert.equal(persistedEvents[0].location, "Großer Saal");
  assert.match(pageText(freshRenderer), /Früheren Stand wiederhergestellt/);
  assert.match(pageText(freshRenderer), /Admin \(Passwortzugang\)/);
  await click(freshRenderer.root.findByProps({ id: "events-tab" }));
  assert.equal(
    freshRenderer.root.findAllByProps({
      "aria-label": "„Prüftermin“ bearbeiten",
    }).length,
    1,
  );
  await click(findButton(freshRenderer.root, "Löschen", { exact: true }));
  assert.equal(persistedEvents.length, 0);
  assert.equal(
    freshRenderer.root.findAllByProps({
      "aria-label": "„Prüftermin“ bearbeiten",
    }).length,
    0,
  );
  assert.match(pageText(freshRenderer), /0 Termine/);
  assert.match(pageText(freshRenderer), /wurde gelöscht/);

  await click(findButton(freshRenderer.root, "Änderungsprotokoll", { exact: true }));
  assert.match(pageText(freshRenderer), /Termin gelöscht/);
  assert.match(pageText(freshRenderer), /Früheren Stand wiederhergestellt/);

  await act(async () => {
    freshRenderer.unmount();
  });
});
