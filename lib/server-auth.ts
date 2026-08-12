import { and, eq, gt, lt } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { ensureDatabaseSchema } from "../db/ensure-schema";
import { accessSessions } from "../db/schema";

export type AccessRole = "student" | "teacher";

const sessionLifetimeMs = 12 * 60 * 60 * 1000;

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function accessCodes() {
  return {
    student: env.STUDENT_ACCESS_CODE?.trim().toUpperCase(),
    teacher: env.ADMIN_ACCESS_CODE?.trim().toUpperCase(),
  };
}

export async function createAccessSession(code: string) {
  await ensureDatabaseSchema();
  const normalizedCode = code.trim().toUpperCase();
  const codes = accessCodes();

  if (!codes.student || !codes.teacher) {
    throw new Error("Die Zugangscodes sind auf dem Server noch nicht eingerichtet.");
  }

  let role: AccessRole | undefined;
  if (normalizedCode === codes.teacher) role = "teacher";
  if (normalizedCode === codes.student) role = "student";
  if (!role) return null;

  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const tokenHash = await hashToken(token);
  const now = new Date();
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
