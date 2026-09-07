import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("keeps calendar data and audit history behind server authorization", async () => {
  const [
    accessRoute,
    eventsRoute,
    auditRoute,
    restoreRoute,
    auth,
    response,
    app,
    schema,
    envExample,
    gitignore,
  ] =
    await Promise.all([
      readFile(new URL("../app/api/access/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/events/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/audit-logs/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/audit-logs/restore/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/server-auth.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/api-response.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/KlassenkompassApp.tsx", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../.env.example", import.meta.url), "utf8"),
      readFile(new URL("../.gitignore", import.meta.url), "utf8"),
    ]);

  const authorizationCheck = eventsRoute.indexOf("getAccessRole(request)");
  const databaseRead = eventsRoute.indexOf(".select()");
  assert.ok(authorizationCheck >= 0 && authorizationCheck < databaseRead);
  assert.match(eventsRoute, /if \(!role\)[\s\S]*status: 401/);
  assert.match(eventsRoute, /identity\?\.role !== "teacher"/);
  assert.match(eventsRoute, /export async function PUT/);
  assert.match(eventsRoute, /export async function DELETE/);
  assert.match(eventsRoute, /env\.DB\.batch/);
  assert.match(eventsRoute, /calendar_event_audit_logs/);
  assert.match(eventsRoute, /before_state, after_state/);
  assert.match(auditRoute, /identity\?\.role !== "teacher"/);
  assert.match(auditRoute, /orderBy/);
  assert.match(restoreRoute, /identity\?\.role !== "teacher"/);
  assert.match(restoreRoute, /sourceLog\.beforeState/);
  assert.match(restoreRoute, /'restore'/);
  assert.match(restoreRoute, /ON CONFLICT\(id\) DO UPDATE/);
  assert.match(accessRoute, /AccessRateLimitError/);
  assert.match(accessRoute, /createStudentAccessSession/);
  assert.match(accessRoute, /createAdminAccessSession/);
  assert.match(accessRoute, /role === "teacher"/);
  assert.match(accessRoute, /status: 429/);
  assert.match(auth, /failedAttemptLimit = 5/);
  assert.match(auth, /minimumAccessCodeLength = 16/);
  assert.match(auth, /AUTH_RATE_LIMIT_SECRET/);
  assert.match(auth, /ADMIN_ACCESS_CODE/);
  assert.match(auth, /admin-password/);
  assert.match(auth, /Admin \(Passwortzugang\)/);
  assert.match(auth, /session\.actorEmail !== passwordAdminActorLabel/);
  assert.match(auth, /accessSessionActors/);
  assert.doesNotMatch(auth, /ADMIN_EMAIL_ALLOWLIST|RESEND_API_KEY|ADMIN_EMAIL_FROM/);
  assert.match(auth, /revokeAccessSession/);
  assert.match(response, /Cache-Control", "no-store"/);
  assert.match(response, /GET, POST, PUT, DELETE, OPTIONS/);
  assert.match(response, /KLASSENKOMPASS_WEB_ORIGIN/);
  assert.match(app, /useState<CalendarEvent\[]>\(\[\]\)/);
  assert.match(app, /type=\{isAccessCodeVisible \? "text" : "password"\}/);
  assert.match(app, /type=\{isAdminPasswordVisible \? "text" : "password"\}/);
  assert.match(app, /maxLength=\{128\}/);
  assert.match(app, /id="admin-password"/);
  assert.match(app, /role: "teacher"/);
  assert.doesNotMatch(app, /\/api\/admin-auth|admin-email|one-time-code/);
  assert.doesNotMatch(app, /id="actor-name"|submittedActorName/);
  assert.match(app, /method: "DELETE"/);
  assert.match(app, /\/api\/audit-logs\/restore/);
  assert.match(schema, /calendar_event_audit_logs/);
  assert.match(schema, /beforeState: text\("before_state"\)/);
  assert.match(schema, /admin_login_challenges/);
  assert.match(envExample, /replace-with-a-long-random-student-code/);
  assert.match(envExample, /^ADMIN_ACCESS_CODE=/m);
  assert.match(envExample, /^KLASSENKOMPASS_WEB_ORIGIN=/m);
  assert.doesNotMatch(envExample, /ADMIN_EMAIL_ALLOWLIST|RESEND_API_KEY|ADMIN_EMAIL_FROM/);
  assert.match(gitignore, /^\.env\*/m);

  await assert.rejects(
    access(new URL("../app/api/admin-auth/request/route.ts", import.meta.url)),
  );
  await assert.rejects(
    access(new URL("../app/api/admin-auth/verify/route.ts", import.meta.url)),
  );
  await assert.rejects(
    access(new URL("../lib/server-admin-auth.ts", import.meta.url)),
  );
});

test("does not embed server secrets in the public build", async () => {
  const html = await readFile(
    new URL("../public-dist/index.html", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    html,
    /STUDENT_ACCESS_CODE|ADMIN_ACCESS_CODE|AUTH_RATE_LIMIT_SECRET|ADMIN_EMAIL_ALLOWLIST|ADMIN_EMAIL_FROM|RESEND_API_KEY/,
  );
});
