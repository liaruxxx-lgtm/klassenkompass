import { createAccessSession } from "../../../lib/server-auth";
import { jsonResponse, optionsResponse } from "../../../lib/api-response";

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { code?: unknown };
    const code = typeof payload.code === "string" ? payload.code : "";
    if (!code.trim()) {
      return jsonResponse(
        request,
        { error: "Bitte einen Zugangscode eingeben." },
        { status: 400 },
      );
    }

    const session = await createAccessSession(code);
    if (!session) {
      return jsonResponse(
        request,
        { error: "Dieser Zugangscode ist nicht gültig." },
        { status: 401 },
      );
    }

    return jsonResponse(request, session);
  } catch (error) {
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
