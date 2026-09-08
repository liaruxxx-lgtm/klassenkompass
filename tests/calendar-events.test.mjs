import assert from "node:assert/strict";
import test from "node:test";
import { parseNewCalendarEvent } from "../lib/calendar-events.ts";

test("parses a test as its own calendar event type", () => {
  const result = parseNewCalendarEvent({
    type: "test",
    category: "Tests",
    title: "Mathematiktest",
    startDate: "2099-02-03",
    audience: "Gesamte Klasse",
  });

  assert.deepEqual(result, {
    event: {
      type: "test",
      category: "Tests",
      title: "Mathematiktest",
      startDate: "2099-02-03",
      audience: "Gesamte Klasse",
    },
  });
});

test("keeps tests out of task and submission categories", () => {
  const result = parseNewCalendarEvent({
    type: "test",
    category: "Abgaben",
    title: "Mathematiktest",
    startDate: "2099-02-03",
    audience: "Gesamte Klasse",
  });

  assert.deepEqual(result, {
    error: "Tests müssen im Bereich „Tests“ geführt werden.",
  });
});
