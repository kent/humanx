// Cross-context relay for X OAuth results. Postgres in production (serverless
// instances don't share memory); in-memory for single-process dev/tests.

const PENDING_TTL_MS = 10 * 60 * 1000;

const memory = new Map<string, { value: string; exp: number }>();

function isPostgresConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export async function putPendingXConnection(
  linkCode: string,
  sessionValue: string,
  now: number = Date.now(),
): Promise<void> {
  const exp = now + PENDING_TTL_MS;
  if (isPostgresConfigured()) {
    const { pgPutPendingX } = await import("@/lib/x-connect-pg");
    await pgPutPendingX(linkCode, sessionValue, new Date(exp));
    return;
  }
  memory.set(linkCode, { value: sessionValue, exp });
}

export async function takePendingXConnection(
  linkCode: string,
  now: number = Date.now(),
): Promise<string | null> {
  if (isPostgresConfigured()) {
    const { pgTakePendingX } = await import("@/lib/x-connect-pg");
    return pgTakePendingX(linkCode, new Date(now));
  }
  const entry = memory.get(linkCode);
  memory.delete(linkCode);
  if (!entry || entry.exp < now) return null;
  return entry.value;
}

export function resetPendingXConnectionsForTests(): void {
  memory.clear();
}
