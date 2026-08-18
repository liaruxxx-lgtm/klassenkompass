import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  eighthGradeEpochs,
  retiredTestEventIds,
} from "../lib/eighth-grade-epochs.ts";
import { parseNewCalendarEvent } from "../lib/calendar-events.ts";

test("seeds the six verified periods from the 2026/2027 plan for class 8", () => {
  assert.deepEqual(
    eighthGradeEpochs.map(({ title, startDate, endDate }) => ({
      title,
      startDate,
      endDate,
    })),
    [
      { title: "Mathematik", startDate: "2026-08-31", endDate: "2026-09-25" },
      { title: "Physik", startDate: "2026-11-16", endDate: "2026-12-04" },
      { title: "Chemie", startDate: "2026-12-07", endDate: "2026-12-22" },
      {
        title: "Theater – Übungszeit fürs Achtklass-Stück",
        startDate: "2027-01-11",
        endDate: "2027-02-05",
      },
      { title: "Geometrie", startDate: "2027-02-22", endDate: "2027-03-12" },
      { title: "Mathematik II", startDate: "2027-05-10", endDate: "2027-06-04" },
    ],
  );

  assert.equal(new Set(eighthGradeEpochs.map(({ id }) => id)).size, 6);
  assert.equal(
    eighthGradeEpochs.filter(({ category }) => category === "Epochen").length,
    5,
  );
  assert.equal(
    eighthGradeEpochs.filter(({ category }) => category === "Achtklass-Stück").length,
    1,
  );

  for (const { id, ...event } of eighthGradeEpochs) {
    assert.match(id, /^epoch-8-/);
    assert.deepEqual(parseNewCalendarEvent(event), { event });
  }

  const theater = eighthGradeEpochs.find(({ id }) => id === "epoch-8-2027-theater");
  assert.deepEqual(
    {
      type: theater?.type,
      category: theater?.category,
      description: theater?.description,
    },
    {
      type: "period",
      category: "Achtklass-Stück",
      description: "Theaterphase und Übungszeit für das Achtklass-Stück.",
    },
  );
});

test("retires only the three identified test calendar entries", () => {
  assert.deepEqual(retiredTestEventIds, [
    "722e8f6a-e0b9-4cb3-aec7-abe707febe47",
    "f3f9f9ee-fc11-4909-9e30-53e9cfaf86e8",
    "6c859778-2c8e-43e7-aa95-582546f295d1",
  ]);
  assert.equal(new Set(retiredTestEventIds).size, 3);
});

test("seeds official entries once and deletes test data by exact ids", async () => {
  const source = await readFile(
    new URL("../db/ensure-schema.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /ON CONFLICT\(id\) DO UPDATE SET/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS calendar_event_seed_runs/);
  assert.match(
    source,
    /WHERE NOT EXISTS \(\s+SELECT 1\s+FROM calendar_event_seed_runs\s+WHERE seed_key = \?/,
  );
  assert.match(source, /INSERT OR IGNORE INTO calendar_event_seed_runs \(seed_key\)/);
  assert.match(source, /DELETE FROM calendar_events\s+WHERE id IN \(\?, \?, \?\)/);
  assert.doesNotMatch(source, /DELETE FROM calendar_events\s+WHERE title/i);
});
