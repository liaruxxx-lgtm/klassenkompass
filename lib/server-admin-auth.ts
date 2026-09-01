import { and, eq, lt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { ensureDatabaseSchema } from "../db/ensure-schema";
import { adminLoginChallenges } from "../db/schema";
import {
  cleanupExpiredAccessSessions,
  clearAccessRateLimit,
  constantTimeEqual,
  enforceAccessRateLimit,
  getAuthProtectionSecret,
  hashAccessValue,
  recordAccessAttempt,
  teacherSessionLifetimeMs,
} from "./server-auth";

const challengeLifetimeMs = 10 * 60 * 1000;
const challengeRetentionMs = 24 * 60 * 60 * 1000;
const maximumCodeAttempts = 5;
const maximumEmailLength = 254;
const maximumChallengeIdLength = 128;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AdminEmailInputError extends Error {
  constructor(message = "Bitte geben Sie eine gültige E-Mail-Adresse ein.") {
    super(message);
    this.name = "AdminEmailInputError";
  }
}

export function normalizeAdminEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    !normalized ||
    normalized.length > maximumEmailLength ||
    !emailPattern.test(normalized)
  ) {
    throw new AdminEmailInputError();
  }
  return normalized;
}

function adminEmailConfiguration() {
  const allowlistValue = env.ADMIN_EMAIL_ALLOWLIST?.trim() ?? "";
  const resendApiKey = env.RESEND_API_KEY?.trim() ?? "";
  const from = env.ADMIN_EMAIL_FROM?.trim() ?? "";
  const allowlist = new Set(
    allowlistValue
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean)
      .map(normalizeAdminEmail),
  );

  if (
    allowlist.size === 0 ||
    allowlist.size > 100 ||
    !resendApiKey ||
    !from ||
    from.length > 200
  ) {
    throw new Error(
      "Der Admin-E-Mail-Zugang ist auf dem Server noch nicht eingerichtet.",
    );
  }

  return { allowlist, resendApiKey, from };
}

function createOneTimeCode() {
  const unbiasedUpperBound = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= unbiasedUpperBound);
  return String(values[0] % 1_000_000).padStart(6, "0");
}

async function hashOneTimeCode(challengeId: string, code: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthProtectionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`admin-email-code\u0000${challengeId}\u0000${code}`),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function sendOneTimeCode(
  email: string,
  code: string,
  challengeId: string,
  configuration: ReturnType<typeof adminEmailConfiguration>,
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configuration.resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `admin-login/${challengeId}`,
    },
    body: JSON.stringify({
      from: configuration.from,
      to: [email],
      subject: "Ihr Klassenkompass-Admincode",
      text: [
        "Mit diesem Einmalcode öffnen Sie die Admin-Ansicht des Klassenkompasses:",
        "",
        code,
        "",
        "Der Code ist 10 Minuten gültig und kann nur einmal verwendet werden.",
        "Falls Sie diese Anmeldung nicht angefordert haben, ignorieren Sie diese E-Mail.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(`E-Mail-Versand fehlgeschlagen (${response.status}).`);
  }
}

export async function requestAdminLogin(request: Request, emailValue: string) {
  await ensureDatabaseSchema();
  const email = normalizeAdminEmail(emailValue);
  const configuration = adminEmailConfiguration();
  const rateLimit = await enforceAccessRateLimit(
    request,
    "admin-email-request",
    email,
  );
  await recordAccessAttempt(rateLimit.identifierHash, rateLimit.attempt);

  const publicChallengeId = crypto.randomUUID();
  if (!configuration.allowlist.has(email)) {
    return { challengeId: publicChallengeId };
  }

  const now = new Date();
  const code = createOneTimeCode();
  const codeHash = await hashOneTimeCode(publicChallengeId, code);
  const expiresAt = new Date(now.getTime() + challengeLifetimeMs).toISOString();
  await getDb()
    .delete(adminLoginChallenges)
    .where(
      lt(
        adminLoginChallenges.expiresAt,
        new Date(now.getTime() - challengeRetentionMs).toISOString(),
      ),
    );
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE admin_login_challenges
      SET used_at = ?
      WHERE admin_email = ? AND used_at IS NULL
    `).bind(now.toISOString(), email),
    env.DB.prepare(`
      INSERT INTO admin_login_challenges (
        id, admin_email, code_hash, expires_at, attempts, used_at
      ) VALUES (?, ?, ?, ?, 0, NULL)
    `).bind(publicChallengeId, email, codeHash, expiresAt),
  ]);

  try {
    await sendOneTimeCode(email, code, publicChallengeId, configuration);
    return { challengeId: publicChallengeId };
  } catch (error) {
    await getDb()
      .delete(adminLoginChallenges)
      .where(eq(adminLoginChallenges.id, publicChallengeId));
    console.error(
      "Admin login email delivery failed",
      error instanceof Error ? error.message : "unknown delivery error",
    );
    return { challengeId: crypto.randomUUID() };
  }
}

export async function verifyAdminLogin(
  request: Request,
  emailValue: string,
  challengeIdValue: string,
  codeValue: string,
) {
  await ensureDatabaseSchema();
  const email = normalizeAdminEmail(emailValue);
  const challengeId = challengeIdValue.trim();
  const code = codeValue.trim();
  const configuration = adminEmailConfiguration();
  const rateLimit = await enforceAccessRateLimit(
    request,
    "admin-email-verify",
    email,
  );

  if (
    !configuration.allowlist.has(email) ||
    !challengeId ||
    challengeId.length > maximumChallengeIdLength ||
    !/^\d{6}$/.test(code)
  ) {
    await recordAccessAttempt(rateLimit.identifierHash, rateLimit.attempt);
    return null;
  }

  const [challenge] = await getDb()
    .select()
    .from(adminLoginChallenges)
    .where(
      and(
        eq(adminLoginChallenges.id, challengeId),
        eq(adminLoginChallenges.adminEmail, email),
      ),
    )
    .limit(1);
  const now = new Date();
  const nowIso = now.toISOString();
  const submittedHash = await hashOneTimeCode(challengeId, code);
  if (
    !challenge ||
    challenge.usedAt !== null ||
    challenge.expiresAt <= nowIso ||
    challenge.attempts >= maximumCodeAttempts ||
    !constantTimeEqual(submittedHash, challenge.codeHash)
  ) {
    if (challenge && challenge.usedAt === null) {
      await env.DB.prepare(`
        UPDATE admin_login_challenges
        SET attempts = attempts + 1
        WHERE id = ? AND used_at IS NULL AND attempts < ?
      `)
        .bind(challengeId, maximumCodeAttempts)
        .run();
    }
    await recordAccessAttempt(rateLimit.identifierHash, rateLimit.attempt);
    return null;
  }

  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const tokenHash = await hashAccessValue(token);
  const expiresAt = new Date(
    now.getTime() + teacherSessionLifetimeMs,
  ).toISOString();
  await cleanupExpiredAccessSessions(nowIso);
  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO access_sessions (token_hash, role, expires_at)
      SELECT ?, 'teacher', ?
      FROM admin_login_challenges
      WHERE id = ? AND admin_email = ? AND code_hash = ?
        AND used_at IS NULL AND expires_at > ? AND attempts < ?
    `).bind(
      tokenHash,
      expiresAt,
      challengeId,
      email,
      submittedHash,
      nowIso,
      maximumCodeAttempts,
    ),
    env.DB.prepare(`
      INSERT INTO access_session_actors (token_hash, actor_name)
      SELECT ?, ?
      WHERE EXISTS (
        SELECT 1 FROM access_sessions WHERE token_hash = ?
      )
    `).bind(tokenHash, email, tokenHash),
    env.DB.prepare(`
      UPDATE admin_login_challenges
      SET used_at = ?
      WHERE id = ? AND EXISTS (
        SELECT 1 FROM access_sessions WHERE token_hash = ?
      )
    `).bind(nowIso, challengeId, tokenHash),
  ]);

  if ((results[0].meta.changes ?? 0) === 0) {
    await recordAccessAttempt(rateLimit.identifierHash, rateLimit.attempt);
    return null;
  }

  await clearAccessRateLimit(rateLimit.identifierHash);
  return {
    role: "teacher" as const,
    token,
    expiresAt,
    actorEmail: email,
  };
}
