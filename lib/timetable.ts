export const timetableDays = [
  { key: "mon", label: "Montag", short: "Mo" },
  { key: "tue", label: "Dienstag", short: "Di" },
  { key: "wed", label: "Mittwoch", short: "Mi" },
  { key: "thu", label: "Donnerstag", short: "Do" },
  { key: "fri", label: "Freitag", short: "Fr" },
] as const;

export type TimetableDayKey = (typeof timetableDays)[number]["key"];
export type TimetableTone =
  | "ocean"
  | "blue"
  | "sky"
  | "terracotta"
  | "amber"
  | "gold"
  | "green"
  | "plum"
  | "rose";

export type TimetableRow =
  | {
      type: "lesson";
      number: number;
      label: string;
      start: string;
      end: string;
    }
  | {
      type: "break";
      label: string;
      start: string;
      end: string;
      duration: number;
    };

export const timetableRows = [
  { type: "lesson", number: 1, label: "HU 1", start: "08:00", end: "08:50" },
  { type: "lesson", number: 2, label: "HU 2", start: "08:50", end: "09:40" },
  { type: "break", label: "1. Große Pause", start: "09:40", end: "10:00", duration: 20 },
  { type: "lesson", number: 3, label: "1. FS", start: "10:00", end: "10:45" },
  { type: "lesson", number: 4, label: "2. FS", start: "10:50", end: "11:35" },
  { type: "break", label: "2. Große Pause", start: "11:35", end: "11:50", duration: 15 },
  { type: "lesson", number: 5, label: "3. FS", start: "11:50", end: "12:35" },
  { type: "lesson", number: 6, label: "4. FS", start: "12:40", end: "13:20" },
  { type: "break", label: "Mittagspause", start: "13:20", end: "14:05", duration: 45 },
  { type: "lesson", number: 7, label: "NA 1", start: "14:05", end: "14:50" },
  { type: "lesson", number: 8, label: "NA 2", start: "14:50", end: "15:35" },
] satisfies readonly TimetableRow[];

type TimetableSubject = {
  id: string;
  name: string;
  teacher?: string;
  tone: TimetableTone;
};

const timetableSubjects: readonly TimetableSubject[] = [
  { id: "hu-os", name: "HU OS", tone: "ocean" },
  { id: "eng", name: "Eng", teacher: "Horl", tone: "blue" },
  { id: "fra", name: "Fra", teacher: "FD", tone: "sky" },
  { id: "kun", name: "Kun", teacher: "Zin", tone: "terracotta" },
  { id: "hgw", name: "HGW", teacher: "Sche / Gra / Spatz", tone: "amber" },
  { id: "spo", name: "Spo", teacher: "Rex / Scha", tone: "gold" },
  { id: "eur", name: "Eur", teacher: "Var", tone: "green" },
  { id: "mus", name: "Mus", teacher: "Ars", tone: "plum" },
  { id: "ueb", name: "Üb", teacher: "Bö", tone: "rose" },
  { id: "mat", name: "Mat", teacher: "Raf", tone: "ocean" },
  { id: "zag1", name: "ZAG1", teacher: "Scha", tone: "amber" },
  { id: "orch1", name: "Orch1", teacher: "Gör", tone: "blue" },
];

const timetableSubjectById = new Map(
  timetableSubjects.map((subject) => [subject.id, subject]),
);

type TimetableLessonOption = {
  group: string;
  subjectId: string;
  teacher?: string;
};

type TimetableLesson = {
  subjectId: string;
  teacher?: string;
  options?: readonly TimetableLessonOption[];
};

const timetableLessons: Record<
  TimetableDayKey,
  Readonly<Record<number, TimetableLesson>>
> = {
  mon: {
    1: { subjectId: "hu-os" },
    2: { subjectId: "hu-os" },
    3: { subjectId: "eng" },
    4: { subjectId: "fra" },
    5: { subjectId: "spo" },
    6: { subjectId: "spo" },
  },
  tue: {
    1: { subjectId: "hu-os" },
    2: { subjectId: "hu-os" },
    3: { subjectId: "kun" },
    4: { subjectId: "kun" },
    5: {
      subjectId: "eur",
      options: [
        { group: "Gruppe 1", subjectId: "eur", teacher: "Var" },
        { group: "Gruppe 2", subjectId: "mus", teacher: "Ars" },
      ],
    },
    6: {
      subjectId: "mus",
      options: [
        { group: "Gruppe 1", subjectId: "mus", teacher: "Ars" },
        { group: "Gruppe 2", subjectId: "eur", teacher: "Var" },
      ],
    },
    7: { subjectId: "zag1" },
    8: { subjectId: "zag1" },
  },
  wed: {
    1: { subjectId: "hu-os" },
    2: { subjectId: "hu-os" },
    3: { subjectId: "eng" },
    4: { subjectId: "fra" },
    5: { subjectId: "hgw" },
    6: { subjectId: "hgw" },
  },
  thu: {
    1: { subjectId: "hu-os" },
    2: { subjectId: "hu-os" },
    3: { subjectId: "hgw" },
    4: { subjectId: "hgw" },
    5: {
      subjectId: "eng",
      options: [
        { group: "Gruppe 1", subjectId: "eng", teacher: "Horl" },
        { group: "Gruppe 2", subjectId: "eur", teacher: "Var" },
      ],
    },
    6: {
      subjectId: "eur",
      options: [
        { group: "Gruppe 1", subjectId: "eur", teacher: "Var" },
        { group: "Gruppe 2", subjectId: "eng", teacher: "Horl" },
      ],
    },
    7: { subjectId: "orch1" },
    8: { subjectId: "orch1" },
  },
  fri: {
    1: { subjectId: "hu-os" },
    2: { subjectId: "hu-os" },
    3: { subjectId: "ueb" },
    4: { subjectId: "mat" },
    5: {
      subjectId: "fra",
      options: [
        { group: "Gruppe 1", subjectId: "fra", teacher: "FD" },
        { group: "Gruppe 2", subjectId: "mus", teacher: "Ars" },
      ],
    },
    6: {
      subjectId: "mus",
      options: [
        { group: "Gruppe 1", subjectId: "mus", teacher: "Ars" },
        { group: "Gruppe 2", subjectId: "fra", teacher: "FD" },
      ],
    },
  },
};

export type TimetableLessonEntry = {
  group?: string;
  name: string;
  teacher: string;
  tone: TimetableTone;
};

export function getTimetableEntries(
  dayKey: TimetableDayKey,
  lessonNumber: number,
): TimetableLessonEntry[] {
  const lesson = timetableLessons[dayKey][lessonNumber];
  if (!lesson) return [];

  const options = lesson.options?.length
    ? lesson.options
    : [{ group: "", subjectId: lesson.subjectId, teacher: lesson.teacher }];

  return options.flatMap((option) => {
    const subject = timetableSubjectById.get(option.subjectId);
    if (!subject) return [];
    return [
      {
        group: option.group || undefined,
        name: subject.name,
        teacher: option.teacher || subject.teacher || "",
        tone: subject.tone,
      },
    ];
  });
}
