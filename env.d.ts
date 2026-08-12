declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    STUDENT_ACCESS_CODE?: string;
    ADMIN_ACCESS_CODE?: string;
  }
}
