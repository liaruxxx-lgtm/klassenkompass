import { and, eq, gt, lt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { ensureDatabaseSchema } from "../db/ensure-schema";
import { accessRateLimits, accessSessions } from "../db/schema";

export type AccessRole = "student" | "teacher";

const studentSessionLifetimeMs = 12 * 60 * 60 * 1000;
const teacherSessionLifetimeMs = 4 * 60 * 60 * 1000;
const failedAttemptLimit = 5;
const attemptWindowMs = 15 * 60 * 1000;
const blockDurationMs = 15 * 60 * 1000;
const rateLimitRetentionMs = 24 * 60 * 60 * 1000;
const minimumAccessCodeLength = 16;
const maximumAccessCodeLength = 128;

export class AccessRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Zu viele falsche Versuche.");
    this.name = "AccessRateLimitError";
  }
}

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function accessCodes() {
  const codes = {
    student: env.STUDENT_ACCESS_CODE?.trim().toUpperCase(),
    teacher: env.ADMIN_ACCESS_CODE?.trim().toUpperCase(),
  };

  if (
    !codes.student ||
    !codes.teacher ||
    codes.student.length < minimumAccessCodeLength ||
    codes.teacher.length < minimumAccessCodeLength ||
    codes.student.length > maximumAccessCodeLength ||
    codes.teacher.length > maximumAccessCodeLength ||
    codes.student === codes.teacher
  ) {
    throw new Error("Der Zugang ist auf dem Server noch nicht sicher eingerichtet.");
  }

  return { student: codes.student, teacher: codes.teacher };
}

function constantTimeEqual(first: string, second: string) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
}

async function accessAttemptKey(request: Request) {
  const secret = env.AUTH_RATE_LIMIT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("Der Zugangsschutz ist auf dem Server noch nicht sicher eingerichtet.");
  }

  const clientAddress = request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  return hashToken(`${secret}\u0000${clientAddress}`);
}

async function enforceAccessRateLimit(request: Request) {
  const db = getDb();
  const now = Date.now();
  const identifierHash = await accessAttemptKey(request);

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

async function recordAccessFailure(
  identifierHash: string,
  attempt: typeof accessRateLimits.$inferSelect | undefined,
) {
  const now = Date.now();
  const failures = (attempt?.failures ?? 0) + 1;
  const blockedUntil = failures >= failedAttemptLimit ? now + blockDurationMs : null;
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

export async function createAccessSession(request: Request, code: string) {
  await ensureDatabaseSchema();
  const normalizedCode = code.trim().toUpperCase();
  const codes = accessCodes();
  const rateLimit = await enforceAccessRateLimit(request);

  const [candidateHash, studentHash, teacherHash] = await Promise.all([
    hashToken(normalizedCode),
    hashToken(codes.student),
    hashToken(codes.teacher),
  ]);

  let role: AccessRole | undefined;
  if (constantTimeEqual(candidateHash, teacherHash)) role = "teacher";
  if (constantTimeEqual(candidateHash, studentHash)) role = "student";
  if (!role) {
    await recordAccessFailure(rateLimit.identifierHash, rateLimit.attempt);
    return null;
  }

  await getDb()
    .delete(accessRateLimits)
    .where(eq(accessRateLimits.identifierHash, rateLimit.identifierHash));

  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const tokenHash = await hashToken(token);
  const now = new Date();
  const sessionLifetimeMs =
    role === "teacher" ? teacherSessionLifetimeMs : studentSessionLifetimeMs;
  const expiresAt = new Date(now.getTime() + sessionLifetimeMs).toISOString();
  const db = getDb();

  await db.delete(accessSessions).where(lt(accessSessions.expiresAt, now.toISOString()));
  await db.insert(accessSessions).values({ tokenHash, role, expiresAt });

  return { role, token, expiresAt };
}

export async function getAccessRole(request: Request) {
  await ensureDatabaseSchema();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) return null;

  const tokenHash = await hashToken(token);
  const now = new Date().toISOString();
  const [session] = await getDb()
    .select({ role: accessSessions.role })
    .from(accessSessions)
    .where(
      and(
        eq(accessSessions.tokenHash, tokenHash),
        gt(accessSessions.expiresAt, now),
      ),
    )
    .limit(1);

  return session?.role === "student" || session?.role === "teacher"
    ? session.role
    : null;
}

export async function revokeAccessSession(request: Request) {
  await ensureDatabaseSchema();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) return;

  await getDb()
    .delete(accessSessions)
    .where(eq(accessSessions.tokenHash, await hashToken(token)));
}
