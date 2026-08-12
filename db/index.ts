import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Die Datenbank ist nicht verbunden. In .openai/hosting.json muss die D1-Bindung DB gesetzt sein.",
    );
  }

  return drizzle(env.DB, { schema });
}
