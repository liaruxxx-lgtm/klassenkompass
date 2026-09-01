import assert from "node:assert/strict";
import test from "node:test";
import {
  getTimetableEntries,
  timetableDays,
  timetableRows,
} from "../lib/timetable.ts";

test("contains the verified school week and lesson times", () => {
  assert.deepEqual(
    timetableDays.map(({ key, label, short }) => ({ key, label, short })),
    [
      { key: "mon", label: "Montag", short: "Mo" },
      { key: "tue", label: "Dienstag", short: "Di" },
      { key: "wed", label: "Mittwoch", short: "Mi" },
      { key: "thu", label: "Donnerstag", short: "Do" },
      { key: "fri", label: "Freitag", short: "Fr" },
    ],
  );
  assert.deepEqual(timetableRows[0], {
    type: "lesson",
    number: 1,
    label: "HU 1",
    start: "08:00",
    end: "08:50",
  });
  assert.deepEqual(timetableRows[2], {
    type: "break",
    label: "1. Große Pause",
    start: "09:40",
    end: "10:00",
    duration: 20,
  });
  assert.deepEqual(timetableRows[8], {
    type: "break",
    label: "Mittagspause",
    start: "13:20",
    end: "14:05",
    duration: 45,
  });
});

test("keeps group subjects and fixed HGW entries readable", () => {
  assert.deepEqual(
    getTimetableEntries("tue", 5).map(({ group, name, teacher }) => ({ group, name, teacher })),
    [
      { group: "Gruppe 1", name: "Eur", teacher: "Var" },
      { group: "Gruppe 2", name: "Mus", teacher: "Ars" },
    ],
  );
  assert.deepEqual(
    getTimetableEntries("thu", 5).map(({ group, name, teacher }) => ({ group, name, teacher })),
    [
      { group: "Gruppe 1", name: "Eng", teacher: "Horl" },
      { group: "Gruppe 2", name: "Eur", teacher: "Var" },
    ],
  );
  const [hgw] = getTimetableEntries("wed", 5);
  assert.deepEqual(
    { name: hgw.name, teacher: hgw.teacher, tone: hgw.tone },
    {
      name: "HGW",
      teacher: "Sche / Gra / Spatz",
      tone: "amber",
    },
  );
});
