import {
  AdminEmailInputError,
  verifyAdminLogin,
} from "../../../../lib/server-admin-auth";
import { AccessRateLimitError } from "../../../../lib/server-auth";
import {
  jsonResponse,
  optionsResponse,
} from "../../../../lib/api-response";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      email?: unknown;
      challengeId?: unknown;
      code?: unknown;
    };
    const email = typeof payload.email === "string" ? payload.email : "";
    const challengeId =
      typeof payload.challengeId === "string" ? payload.challengeId : "";
    const code = typeof payload.code === "string" ? payload.code : "";
    const session = await verifyAdminLogin(
      request,
      email,
      challengeId,
      code,
    );
    if (!session) {
      return jsonResponse(
        request,
        { error: "Der Einmalcode ist falsch, abgelaufen oder bereits verwendet." },
        { status: 401 },
      );
    }
    return jsonResponse(request, session);
  } catch (error) {
    if (error instanceof AdminEmailInputError) {
      return jsonResponse(request, { error: error.message }, { status: 400 });
    }
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
            : "Der Admin-Zugang konnte nicht geprüft werden.",
      },
      { status: 500 },
    );
  }
}
