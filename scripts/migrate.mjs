#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL is not set. Pull it from Vercel with `vercel env pull`.");
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), "migrations");
const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

const sql = postgres(url, {
  ssl: url.includes("sslmode=require") || url.includes("vercel-storage.com") || url.includes("neon.tech") ? "require" : undefined,
  max: 1,
});

try {
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const content = await readFile(fullPath, "utf8");
    console.log(`→ Applying ${file}`);
    await sql.unsafe(content);
  }
  console.log(`✓ Applied ${files.length} migration(s).`);
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
