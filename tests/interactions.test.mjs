import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { act, create } from "react-test-renderer";
import KlassenkompassApp from "../app/KlassenkompassApp.tsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {},
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
    button.props.onClick();
  });
}

async function change(input, value) {
  await act(async () => {
    input.props.onChange({ target: { value } });
  });
}

async function submit(renderer) {
  await act(async () => {
    renderer.root.findByProps({ className: "event-form" }).props.onSubmit({
      preventDefault() {},
    });
  });
}

async function submitAccess(renderer) {
  await act(async () => {
    renderer.root.findByProps({ className: "access-form" }).props.onSubmit({
      preventDefault() {},
    });
  });
}

test("supports the complete temporary prototype flow", async () => {
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(KlassenkompassApp));
  });

  assert.match(pageText(renderer), /Klassenbereich öffnen/);
  assert.doesNotMatch(pageText(renderer), /Aktuelle Epoche/);
  assert.equal(renderer.root.findAllByProps({ className: "role-switch" }).length, 0);

  await submitAccess(renderer);
  assert.match(pageText(renderer), /Bitte einen Zugangscode eingeben/);

  await change(renderer.root.findByProps({ id: "access-code" }), "x");
  assert.equal(renderer.root.findByProps({ id: "access-code" }).props.value, "X");
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Dieser Zugangscode ist nicht gültig/);

  await change(renderer.root.findByProps({ id: "access-code" }), "s");
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Aktuelle Epoche/);
  assert.match(pageText(renderer), /Noch keine Epoche eingetragen/);
  assert.match(pageText(renderer), /Noch keine Termine vorhanden/);
  assert.match(pageText(renderer), /Chronologische Übersicht/);
  assert.match(pageText(renderer), /Schüleransicht/);

  await click(findButton(renderer.root, "Zugang wechseln", { exact: true }));
  await change(renderer.root.findByProps({ id: "access-code" }), "A");
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Jahresrahmen verwalten/);
  assert.match(pageText(renderer), /Noch keine Termine eingetragen/);
  assert.match(pageText(renderer), /Lehreransicht/);

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
  await submit(renderer);

  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 0);
  assert.match(pageText(renderer), /Prüftermin/);
  assert.match(pageText(renderer), /nur temporär/i);
  assert.match(pageText(renderer), /10:30 Uhr/);

  await click(findButton(renderer.root, "Zugang wechseln", { exact: true }));
  await change(renderer.root.findByProps({ id: "access-code" }), "S");
  await submitAccess(renderer);
  assert.match(pageText(renderer), /Als Nächstes/);
  assert.match(pageText(renderer), /Prüftermin/);
  assert.match(pageText(renderer), /Chronologische Übersicht/);

  await act(async () => {
    renderer.unmount();
  });

  let freshRenderer;
  await act(async () => {
    freshRenderer = create(React.createElement(KlassenkompassApp));
  });
  assert.match(pageText(freshRenderer), /Klassenbereich öffnen/);
  assert.doesNotMatch(pageText(freshRenderer), /Prüftermin/);

  await act(async () => {
    freshRenderer.unmount();
  });
});
