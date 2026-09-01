declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    STUDENT_ACCESS_CODE?: string;
    AUTH_RATE_LIMIT_SECRET?: string;
    ADMIN_EMAIL_ALLOWLIST?: string;
    ADMIN_EMAIL_FROM?: string;
    RESEND_API_KEY?: string;
  }
}
