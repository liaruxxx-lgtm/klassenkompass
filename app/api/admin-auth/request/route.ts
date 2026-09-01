import {
  AdminEmailInputError,
  requestAdminLogin,
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
    const payload = (await request.json()) as { email?: unknown };
    const email = typeof payload.email === "string" ? payload.email : "";
    const result = await requestAdminLogin(request, email);
    return jsonResponse(
      request,
      {
        ...result,
        message:
          "Wenn diese Adresse für die Admin-Ansicht freigegeben ist, wurde ein Einmalcode versendet.",
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof AdminEmailInputError) {
      return jsonResponse(request, { error: error.message }, { status: 400 });
    }
    if (error instanceof AccessRateLimitError) {
      return jsonResponse(
        request,
        { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
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
            : "Der Einmalcode konnte nicht angefordert werden.",
      },
      { status: 500 },
    );
  }
}
