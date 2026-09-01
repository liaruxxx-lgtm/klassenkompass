import { and, eq, gt, lt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { ensureDatabaseSchema } from "../db/ensure-schema";
import {
  accessRateLimits,
  accessSessionActors,
  accessSessions,
} from "../db/schema";

export type AccessRole = "student" | "teacher";

const studentSessionLifetimeMs = 12 * 60 * 60 * 1000;
export const teacherSessionLifetimeMs = 4 * 60 * 60 * 1000;
const failedAttemptLimit = 5;
const attemptWindowMs = 15 * 60 * 1000;
const blockDurationMs = 15 * 60 * 1000;
const rateLimitRetentionMs = 24 * 60 * 60 * 1000;
const minimumAccessCodeLength = 16;
const maximumAccessCodeLength = 128;

export class AccessRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Zu viele Versuche.");
    this.name = "AccessRateLimitError";
  }
}

export function getAuthProtectionSecret() {
  const secret = env.AUTH_RATE_LIMIT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "Der Zugangsschutz ist auf dem Server noch nicht sicher eingerichtet.",
    );
  }
  return secret;
}

export async function hashAccessValue(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function constantTimeEqual(first: string, second: string) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
}

function configuredStudentCode() {
  const code = env.STUDENT_ACCESS_CODE?.trim().toUpperCase();
  if (
    !code ||
    code.length < minimumAccessCodeLength ||
    code.length > maximumAccessCodeLength
  ) {
    throw new Error(
      "Der Schülerzugang ist auf dem Server noch nicht sicher eingerichtet.",
    );
  }
  return code;
}

async function accessAttemptKey(
  request: Request,
  scope: string,
  subject = "",
) {
  const clientAddress =
    request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  return hashAccessValue(
    `${getAuthProtectionSecret()}\u0000${scope}\u0000${clientAddress}\u0000${subject}`,
  );
}

export async function enforceAccessRateLimit(
  request: Request,
  scope: string,
  subject = "",
) {
  const db = getDb();
  const now = Date.now();
  const identifierHash = await accessAttemptKey(request, scope, subject);

  await db
    .delete(accessRateLimits)
    .where(lt(accessRateLimits.updatedAt, now - rateLimitRetentionMs));

  const [attempt] = await db
    .select()
    .from(accessRateLimits)
    .where(eq(accessRateLimits.identifierHash, identifierHash))
    .limit(1);

  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    throw new AccessRateLimitError(
      Math.max(1, Math.ceil((attempt.blockedUntil - now) / 1000)),
    );
  }

  if (
    attempt &&
    (now - attempt.windowStartedAt >= attemptWindowMs ||
      (attempt.blockedUntil !== null && attempt.blockedUntil <= now))
  ) {
    await db
      .delete(accessRateLimits)
      .where(eq(accessRateLimits.identifierHash, identifierHash));
    return { identifierHash, attempt: undefined };
  }

  return { identifierHash, attempt };
}

export async function recordAccessAttempt(
  identifierHash: string,
  attempt: typeof accessRateLimits.$inferSelect | undefined,
) {
  const now = Date.now();
  const failures = (attempt?.failures ?? 0) + 1;
  const blockedUntil =
    failures >= failedAttemptLimit ? now + blockDurationMs : null;
  const values = {
    identifierHash,
    failures,
    windowStartedAt: attempt?.windowStartedAt ?? now,
    blockedUntil,
    updatedAt: now,
  };

  await getDb()
    .insert(accessRateLimits)
    .values(values)
    .onConflictDoUpdate({
      target: accessRateLimits.identifierHash,
      set: {
        failures: values.failures,
        windowStartedAt: values.windowStartedAt,
        blockedUntil: values.blockedUntil,
        updatedAt: values.updatedAt,
      },
    });

  if (blockedUntil) {
    throw new AccessRateLimitError(Math.ceil(blockDurationMs / 1000));
  }
}

export async function clearAccessRateLimit(identifierHash: string) {
  await getDb()
    .delete(accessRateLimits)
    .where(eq(accessRateLimits.identifierHash, identifierHash));
}

export async function cleanupExpiredAccessSessions(nowIso: string) {
  await getDb()
    .delete(accessSessions)
    .where(lt(accessSessions.expiresAt, nowIso));
  await env.DB.prepare(`
    DELETE FROM access_session_actors
    WHERE token_hash NOT IN (SELECT token_hash FROM access_sessions)
  `).run();
}

export async function createStudentAccessSession(
  request: Request,
  code: string,
) {
  await ensureDatabaseSchema();
  const normalizedCode = code.trim().toUpperCase();
  const studentCode = configuredStudentCode();
  const rateLimit = await enforceAccessRateLimit(request, "student-code");
  const [candidateHash, studentHash] = await Promise.all([
    hashAccessValue(normalizedCode),
    hashAccessValue(studentCode),
  ]);

  if (!constantTimeEqual(candidateHash, studentHash)) {
    await recordAccessAttempt(rateLimit.identifierHash, rateLimit.attempt);
    return null;
  }

  await clearAccessRateLimit(rateLimit.identifierHash);

  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const tokenHash = await hashAccessValue(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + studentSessionLifetimeMs,
  ).toISOString();

  await cleanupExpiredAccessSessions(now.toISOString());
  await env.DB.prepare(`
    INSERT INTO access_sessions (token_hash, role, expires_at)
    VALUES (?, 'student', ?)
  `)
    .bind(tokenHash, expiresAt)
    .run();

  return { role: "student" as const, token, expiresAt };
}

export async function getAccessIdentity(request: Request) {
  await ensureDatabaseSchema();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) return null;

  const tokenHash = await hashAccessValue(token);
  const now = new Date().toISOString();
  const [session] = await getDb()
    .select({
      role: accessSessions.role,
      actorEmail: accessSessionActors.actorEmail,
    })
    .from(accessSessions)
    .leftJoin(
      accessSessionActors,
      eq(accessSessionActors.tokenHash, accessSessions.tokenHash),
    )
    .where(
      and(
        eq(accessSessions.tokenHash, tokenHash),
        gt(accessSessions.expiresAt, now),
      ),
    )
    .limit(1);

  if (session?.role !== "student" && session?.role !== "teacher") return null;
  return {
    role: session.role,
    ...(session.actorEmail ? { actorEmail: session.actorEmail } : {}),
  };
}

export async function getAccessRole(request: Request) {
  return (await getAccessIdentity(request))?.role ?? null;
}

export async function revokeAccessSession(request: Request) {
  await ensureDatabaseSchema();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) return;

  const tokenHash = await hashAccessValue(token);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM access_session_actors WHERE token_hash = ?").bind(
      tokenHash,
    ),
    env.DB.prepare("DELETE FROM access_sessions WHERE token_hash = ?").bind(
      tokenHash,
    ),
  ]);
}
