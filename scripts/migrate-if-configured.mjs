#!/usr/bin/env node
// Runs DB migrations when a database URL is available (e.g. the Vercel build,
// where the Postgres integration injects POSTGRES_URL), and skips cleanly when
// it is not (e.g. local `next build`). Keeps the strict `db:migrate` script for
// intentional manual runs.
const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!url) {
  console.log("[migrate] No POSTGRES_URL/DATABASE_URL set; skipping migrations.");
  process.exit(0);
}

await import("./migrate.mjs");
