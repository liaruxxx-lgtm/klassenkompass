import assert from "node:assert/strict";
import test from "node:test";
import { eighthGradeEpochs } from "../lib/eighth-grade-epochs.ts";
import { parseNewCalendarEvent } from "../lib/calendar-events.ts";

test("seeds the six verified epochs from the 2026/2027 plan for class 8", () => {
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
      { title: "Theater", startDate: "2027-01-11", endDate: "2027-02-05" },
      { title: "Geometrie", startDate: "2027-02-22", endDate: "2027-03-12" },
      { title: "Mathematik II", startDate: "2027-05-10", endDate: "2027-06-04" },
    ],
  );

  assert.equal(new Set(eighthGradeEpochs.map(({ id }) => id)).size, 6);

  for (const { id, ...event } of eighthGradeEpochs) {
    assert.match(id, /^epoch-8-/);
    assert.deepEqual(parseNewCalendarEvent(event), { event });
  }
});
