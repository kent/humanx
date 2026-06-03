import postgres from "postgres";

import { ApiError } from "@/lib/http";

let sql: ReturnType<typeof postgres> | null = null;

function shouldRequireSsl(url: string): boolean {
  return !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);
}

function getSql(): ReturnType<typeof postgres> {
  if (sql) return sql;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new ApiError(503, "storage_error", "POSTGRES_URL is not configured.");
  sql = postgres(url, { ssl: shouldRequireSsl(url) ? "require" : undefined, max: 3, idle_timeout: 20 });
  return sql;
}

export async function pgPutPendingX(linkCode: string, sessionValue: string, expiresAt: Date): Promise<void> {
  try {
    const db = getSql();
    await db`
      INSERT INTO pending_x_connections (link_code, session_value, expires_at)
      VALUES (${linkCode}, ${sessionValue}, ${expiresAt})
      ON CONFLICT (link_code) DO UPDATE SET
        session_value = EXCLUDED.session_value,
        expires_at = EXCLUDED.expires_at
    `;
  } catch (error) {
    throw new ApiError(503, "storage_error", "Could not store the X connection.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// Atomically claim (delete + return) a non-expired pending connection.
export async function pgTakePendingX(linkCode: string, now: Date): Promise<string | null> {
  try {
    const db = getSql();
    const rows = await db<{ session_value: string }[]>`
      DELETE FROM pending_x_connections
      WHERE link_code = ${linkCode} AND expires_at > ${now}
      RETURNING session_value
    `;
    return rows.length > 0 ? rows[0].session_value : null;
  } catch (error) {
    throw new ApiError(503, "storage_error", "Could not read the X connection.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
