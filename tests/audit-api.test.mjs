import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";

const studentCode = "STUDENT-INTEGRATION-CODE-2026";
const adminPassword = "ADMIN-INTEGRATION-PASSWORD-2026";
const adminActorLabel = "Admin (Passwortzugang)";

function buildWorkerModules() {
  const serverRoot = fileURLToPath(new URL("../dist/server/", import.meta.url));
  const modulePaths = readdirSync(serverRoot, { recursive: true })
    .filter((path) => typeof path === "string" && path.endsWith(".js"))
    .sort((left, right) => {
      if (left === "index.js") return -1;
      if (right === "index.js") return 1;
      return left.localeCompare(right);
    });

  return {
    modulesRoot: serverRoot,
    modules: modulePaths.map((path) => ({
      type: "ESModule",
      path: resolve(serverRoot, path),
    })),
  };
}

async function request(miniflare, path, init = {}) {
  const response = await miniflare.dispatchFetch(
    `http://localhost${path}`,
    init,
  );
  let body;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  return { response, body };
}

function jsonRequest(method, body, token) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

test("persists attributed event history and restores exact earlier states", async () => {
  const { modules, modulesRoot } = buildWorkerModules();
  const miniflare = new Miniflare({
    modules,
    modulesRoot,
    compatibilityDate: "2026-05-22",
    compatibilityFlags: ["nodejs_compat"],
    bindings: {
      STUDENT_ACCESS_CODE: studentCode,
      ADMIN_ACCESS_CODE: adminPassword,
      AUTH_RATE_LIMIT_SECRET:
        "integration-only-rate-limit-secret-with-more-than-32-characters",
    },
    d1Databases: {
      DB: `audit-test-${process.pid}-${Date.now()}`,
    },
  });

  try {
    const studentLogin = await request(
      miniflare,
      "/api/access",
      jsonRequest("POST", { code: studentCode }),
    );
    assert.equal(studentLogin.response.status, 200);
    assert.equal(studentLogin.body.role, "student");

    const wrongAdminLogin = await request(
      miniflare,
      "/api/access",
      jsonRequest("POST", {
        code: "WRONG-ADMIN-PASSWORD-2026",
        role: "teacher",
      }),
    );
    assert.equal(wrongAdminLogin.response.status, 401);
    assert.match(wrongAdminLogin.body.error, /Admin-Passwort/);

    const teacherLogin = await request(
      miniflare,
      "/api/access",
      jsonRequest("POST", {
        code: adminPassword,
        role: "teacher",
      }),
    );
    assert.equal(teacherLogin.response.status, 200);
    assert.equal(teacherLogin.body.role, "teacher");
    assert.equal(teacherLogin.body.actorEmail, adminActorLabel);
    const teacherToken = teacherLogin.body.token;

    const studentAudit = await request(miniflare, "/api/audit-logs", {
      headers: { Authorization: `Bearer ${studentLogin.body.token}` },
    });
    assert.equal(studentAudit.response.status, 403);

    const originalEvent = {
      type: "important",
      category: "Abgaben",
      title: "Prüftermin",
      startDate: "2099-01-15",
      time: "10:30",
      audience: "Gesamte Klasse",
      location: "Großer Saal",
      description: "Bitte zehn Minuten früher da sein.",
    };
    const created = await request(
      miniflare,
      "/api/events",
      jsonRequest("POST", originalEvent, teacherToken),
    );
    assert.equal(created.response.status, 201);
    assert.ok(created.body.event.id);
    const eventId = created.body.event.id;

    const editedEvent = {
      ...created.body.event,
      title: "Bearbeiteter Prüftermin",
      location: "Kleiner Saal",
    };
    const updated = await request(
      miniflare,
      "/api/events",
      jsonRequest("PUT", editedEvent, teacherToken),
    );
    assert.equal(updated.response.status, 200);
    assert.deepEqual(updated.body.event, editedEvent);

    const deleted = await request(
      miniflare,
      "/api/events",
      jsonRequest("DELETE", { id: eventId }, teacherToken),
    );
    assert.equal(deleted.response.status, 200);

    const history = await request(
      miniflare,
      "/api/audit-logs?offset=0",
      { headers: { Authorization: `Bearer ${teacherToken}` } },
    );
    assert.equal(history.response.status, 200);
    assert.equal(history.body.logs.length, 3);
    assert.deepEqual(
      history.body.logs.map((entry) => entry.action),
      ["delete", "update", "create"],
    );

    const [deleteLog, updateLog, createLog] = history.body.logs;
    for (const entry of history.body.logs) {
      assert.equal(entry.actorEmail, adminActorLabel);
      assert.ok(Number.isFinite(Date.parse(entry.changedAt)));
      assert.equal(entry.eventId, eventId);
    }
    assert.equal(createLog.beforeState, null);
    assert.deepEqual(createLog.afterState, created.body.event);
    assert.deepEqual(updateLog.beforeState, created.body.event);
    assert.deepEqual(updateLog.afterState, editedEvent);
    assert.deepEqual(deleteLog.beforeState, editedEvent);
    assert.equal(deleteLog.afterState, null);

    const restored = await request(
      miniflare,
      "/api/audit-logs/restore",
      jsonRequest("POST", { auditLogId: updateLog.id }, teacherToken),
    );
    assert.equal(restored.response.status, 200);
    assert.deepEqual(restored.body.event, created.body.event);

    const eventsAfterRestore = await request(miniflare, "/api/events", {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.equal(eventsAfterRestore.response.status, 200);
    assert.deepEqual(
      eventsAfterRestore.body.events.find((event) => event.id === eventId),
      created.body.event,
    );

    const historyAfterRestore = await request(
      miniflare,
      "/api/audit-logs?offset=0",
      { headers: { Authorization: `Bearer ${teacherToken}` } },
    );
    assert.equal(historyAfterRestore.response.status, 200);
    assert.equal(historyAfterRestore.body.logs[0].action, "restore");
    assert.equal(historyAfterRestore.body.logs[0].restoredFromLogId, updateLog.id);
    assert.equal(historyAfterRestore.body.logs[0].beforeState, null);
    assert.deepEqual(
      historyAfterRestore.body.logs[0].afterState,
      created.body.event,
    );

    const undoCreation = await request(
      miniflare,
      "/api/audit-logs/restore",
      jsonRequest("POST", { auditLogId: createLog.id }, teacherToken),
    );
    assert.equal(undoCreation.response.status, 200);
    assert.equal(undoCreation.body.event, null);

    const eventsAfterUndoCreation = await request(miniflare, "/api/events", {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    assert.equal(
      eventsAfterUndoCreation.body.events.some((event) => event.id === eventId),
      false,
    );

    const historyAfterUndoCreation = await request(
      miniflare,
      "/api/audit-logs?offset=0",
      { headers: { Authorization: `Bearer ${teacherToken}` } },
    );
    assert.equal(historyAfterUndoCreation.response.status, 200);
    assert.equal(historyAfterUndoCreation.body.logs[0].action, "restore");
    assert.equal(
      historyAfterUndoCreation.body.logs[0].restoredFromLogId,
      createLog.id,
    );
    assert.deepEqual(
      historyAfterUndoCreation.body.logs[0].beforeState,
      created.body.event,
    );
    assert.equal(historyAfterUndoCreation.body.logs[0].afterState, null);

    const studentRestore = await request(
      miniflare,
      "/api/audit-logs/restore",
      jsonRequest("POST", { auditLogId: updateLog.id }, studentLogin.body.token),
    );
    assert.equal(studentRestore.response.status, 403);

    const unauthenticatedRestore = await request(
      miniflare,
      "/api/audit-logs/restore",
      jsonRequest("POST", { auditLogId: updateLog.id }),
    );
    assert.equal(unauthenticatedRestore.response.status, 401);
  } finally {
    await miniflare.dispose();
  }
});
