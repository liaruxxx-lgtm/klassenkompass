import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps calendar data behind server authorization", async () => {
  const [accessRoute, eventsRoute, auth, response, app, envExample, gitignore] =
    await Promise.all([
      readFile(new URL("../app/api/access/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/events/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/server-auth.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/api-response.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/KlassenkompassApp.tsx", import.meta.url), "utf8"),
      readFile(new URL("../.env.example", import.meta.url), "utf8"),
      readFile(new URL("../.gitignore", import.meta.url), "utf8"),
    ]);

  const authorizationCheck = eventsRoute.indexOf("getAccessRole(request)");
  const databaseRead = eventsRoute.indexOf(".select()");
  assert.ok(authorizationCheck >= 0 && authorizationCheck < databaseRead);
  assert.match(eventsRoute, /if \(!role\)[\s\S]*status: 401/);
  assert.match(eventsRoute, /role !== "teacher"/);
  assert.match(eventsRoute, /export async function PUT/);
  assert.match(eventsRoute, /\.update\(calendarEvents\)/);
  assert.match(eventsRoute, /export async function DELETE/);
  assert.match(eventsRoute, /\.delete\(calendarEvents\)/);
  assert.match(accessRoute, /AccessRateLimitError/);
  assert.match(accessRoute, /status: 429/);
  assert.match(auth, /failedAttemptLimit = 5/);
  assert.match(auth, /minimumAccessCodeLength = 16/);
  assert.match(auth, /AUTH_RATE_LIMIT_SECRET/);
  assert.match(auth, /revokeAccessSession/);
  assert.match(response, /Cache-Control", "no-store"/);
  assert.match(response, /GET, POST, PUT, DELETE, OPTIONS/);
  assert.match(app, /useState<CalendarEvent\[]>\(\[\]\)/);
  assert.match(app, /type=\{isAccessCodeVisible \? "text" : "password"\}/);
  assert.match(app, /maxLength=\{128\}/);
  assert.match(app, /method: "DELETE"/);
  assert.doesNotMatch(envExample, /^(?:STUDENT|ADMIN)_ACCESS_CODE=[SA]$/m);
  assert.match(envExample, /replace-with-a-long-random-student-code/);
  assert.match(gitignore, /^\.env\*/m);
});

test("does not embed server secrets in the public build", async () => {
  const html = await readFile(
    new URL("../public-dist/index.html", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    html,
    /STUDENT_ACCESS_CODE|ADMIN_ACCESS_CODE|AUTH_RATE_LIMIT_SECRET/,
  );
});
