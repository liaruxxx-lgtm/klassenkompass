import {
  AccessRateLimitError,
  createAccessSession,
  revokeAccessSession,
} from "../../../lib/server-auth";
import { jsonResponse, optionsResponse } from "../../../lib/api-response";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { code?: unknown };
    const code = typeof payload.code === "string" ? payload.code : "";
    if (!code.trim() || code.length > 128) {
      return jsonResponse(
        request,
        { error: "Bitte einen Zugangscode eingeben." },
        { status: 400 },
      );
    }

    const session = await createAccessSession(request, code);
    if (!session) {
      return jsonResponse(
        request,
        { error: "Dieser Zugangscode ist nicht gültig." },
        { status: 401 },
      );
    }

    return jsonResponse(request, session);
  } catch (error) {
    if (error instanceof AccessRateLimitError) {
      return jsonResponse(
        request,
        { error: "Zu viele falsche Versuche. Bitte später erneut versuchen." },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }

    return jsonResponse(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Der Zugang konnte nicht geprüft werden.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await revokeAccessSession(request);
    return jsonResponse(request, { ok: true });
  } catch {
    return jsonResponse(
      request,
      { error: "Die Sitzung konnte nicht beendet werden." },
      { status: 500 },
    );
  }
}
