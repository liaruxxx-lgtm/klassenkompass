import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps calendar data and audit history behind server authorization", async () => {
  const [
    accessRoute,
    adminRequestRoute,
    adminVerifyRoute,
    eventsRoute,
    auditRoute,
    restoreRoute,
    auth,
    adminAuth,
    response,
    app,
    schema,
    envExample,
    gitignore,
  ] =
    await Promise.all([
      readFile(new URL("../app/api/access/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/admin-auth/request/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/admin-auth/verify/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/api/events/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/audit-logs/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/audit-logs/restore/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/server-auth.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/server-admin-auth.ts", import.meta.url), "utf8"),
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
  assert.doesNotMatch(accessRoute, /actorName|ADMIN_ACCESS_CODE|teacher/);
  assert.match(accessRoute, /status: 429/);
  assert.match(adminRequestRoute, /requestAdminLogin/);
  assert.match(adminRequestRoute, /Wenn diese Adresse.*freigegeben/s);
  assert.match(adminVerifyRoute, /verifyAdminLogin/);
  assert.match(adminVerifyRoute, /status: 401/);
  assert.match(auth, /failedAttemptLimit = 5/);
  assert.match(auth, /minimumAccessCodeLength = 16/);
  assert.match(auth, /AUTH_RATE_LIMIT_SECRET/);
  assert.match(auth, /accessSessionActors/);
  assert.doesNotMatch(auth, /ADMIN_ACCESS_CODE|normalizeActorName/);
  assert.match(auth, /revokeAccessSession/);
  assert.match(adminAuth, /ADMIN_EMAIL_ALLOWLIST/);
  assert.match(adminAuth, /RESEND_API_KEY/);
  assert.match(adminAuth, /ADMIN_EMAIL_FROM/);
  assert.match(adminAuth, /HMAC/);
  assert.match(adminAuth, /Idempotency-Key/);
  assert.match(adminAuth, /configuration\.allowlist\.has\(email\)/);
  assert.match(adminAuth, /used_at IS NULL/);
  assert.match(adminAuth, /maximumCodeAttempts = 5/);
  assert.match(response, /Cache-Control", "no-store"/);
  assert.match(response, /GET, POST, PUT, DELETE, OPTIONS/);
  assert.match(app, /useState<CalendarEvent\[]>\(\[\]\)/);
  assert.match(app, /type=\{isAccessCodeVisible \? "text" : "password"\}/);
  assert.match(app, /maxLength=\{128\}/);
  assert.match(app, /\/api\/admin-auth\/request/);
  assert.match(app, /\/api\/admin-auth\/verify/);
  assert.match(app, /autoComplete="one-time-code"/);
  assert.doesNotMatch(app, /id="actor-name"|submittedActorName/);
  assert.match(app, /method: "DELETE"/);
  assert.match(app, /\/api\/audit-logs\/restore/);
  assert.match(schema, /calendar_event_audit_logs/);
  assert.match(schema, /beforeState: text\("before_state"\)/);
  assert.match(schema, /admin_login_challenges/);
  assert.doesNotMatch(envExample, /^ADMIN_ACCESS_CODE=/m);
  assert.match(envExample, /replace-with-a-long-random-student-code/);
  assert.match(envExample, /^ADMIN_EMAIL_ALLOWLIST=/m);
  assert.match(envExample, /^RESEND_API_KEY=/m);
  assert.match(gitignore, /^\.env\*/m);
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
