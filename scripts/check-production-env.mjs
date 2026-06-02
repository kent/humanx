#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ENV_FILE_NAMES = [".env.production.local", ".env.local"];
const declaredEnvNames = new Set();

function getEnvDeclaration(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return undefined;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex < 1) {
    return undefined;
  }

  const name = trimmed.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    return undefined;
  }

  return {
    name,
    rawValue: trimmed.slice(separatorIndex + 1).trim(),
  };
}

function loadEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const declaration = getEnvDeclaration(line);
    if (declaration) {
      declaredEnvNames.add(declaration.name);
    }
  }

  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(filePath);
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const declaration = getEnvDeclaration(line);
    if (!declaration || process.env[declaration.name] !== undefined) {
      continue;
    }

    const rawValue = declaration.rawValue;
    const quote = rawValue[0];
    const hasMatchingQuotes = (quote === "\"" || quote === "'") && rawValue.endsWith(quote);
    const value = hasMatchingQuotes ? rawValue.slice(1, -1) : rawValue;
    process.env[declaration.name] = quote === "\"" ? value.replaceAll("\\n", "\n") : value;
  }
}

if (process.env.VERIPOST_SKIP_ENV_FILE_LOAD !== "1") {
  for (const name of ENV_FILE_NAMES) {
    const filePath = path.join(process.cwd(), name);
    if (existsSync(filePath)) {
      loadEnvFile(filePath);
    }
  }
}

const REQUIRED_ENV = [
  "NEXT_PUBLIC_WORLD_APP_ID",
  "WORLD_ID_RP_ID",
  "WORLD_ID_RP_SIGNING_KEY",
  "NEXT_PUBLIC_APP_URL",
  "WORLD_ID_ACTION",
  "WORLD_ID_ENVIRONMENT",
];

const STORAGE_ENV = ["POSTGRES_URL", "DATABASE_URL"];
const VERCEL_MANAGED_ENV = new Set(["WORLD_ID_RP_SIGNING_KEY", ...STORAGE_ENV]);

function hasEnvValue(name) {
  return Boolean(process.env[name]?.trim());
}

function isDeclaredVercelManagedEnv(name) {
  return VERCEL_MANAGED_ENV.has(name) && declaredEnvNames.has(name);
}

function hasRequiredEnv(name) {
  return hasEnvValue(name) || isDeclaredVercelManagedEnv(name);
}

const missing = REQUIRED_ENV.filter((name) => !hasRequiredEnv(name));
if (!STORAGE_ENV.some((name) => hasEnvValue(name) || isDeclaredVercelManagedEnv(name))) {
  missing.push("POSTGRES_URL or DATABASE_URL");
}
const vercelManagedOnly = [
  ...REQUIRED_ENV.filter((name) => !hasEnvValue(name) && isDeclaredVercelManagedEnv(name)),
  ...(!STORAGE_ENV.some(hasEnvValue) && STORAGE_ENV.some(isDeclaredVercelManagedEnv)
    ? ["POSTGRES_URL or DATABASE_URL"]
    : []),
];

const invalid = [];
const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID?.trim();
const rpId = process.env.WORLD_ID_RP_ID?.trim();
const rpSigningKey = process.env.WORLD_ID_RP_SIGNING_KEY?.trim();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const environment = process.env.WORLD_ID_ENVIRONMENT?.trim();

if (appId && !/^app_[a-z0-9]+$/i.test(appId)) {
  invalid.push("NEXT_PUBLIC_WORLD_APP_ID must start with app_");
}

if (rpId && !/^rp_[a-z0-9]+$/i.test(rpId)) {
  invalid.push("WORLD_ID_RP_ID must start with rp_");
}

if (rpSigningKey) {
  const keyHex = rpSigningKey.startsWith("0x") ? rpSigningKey.slice(2) : rpSigningKey;
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
    invalid.push("WORLD_ID_RP_SIGNING_KEY must be a 32-byte hex private key");
  }
}

if (appUrl && appUrl !== "https://veripost.io") {
  invalid.push("NEXT_PUBLIC_APP_URL must be https://veripost.io for production deploys");
}

if (environment && environment !== "production") {
  invalid.push("WORLD_ID_ENVIRONMENT must be production for production deploys");
}

if (missing.length > 0 || invalid.length > 0) {
  console.error("Production deploy preflight failed.");
  if (missing.length > 0) {
    console.error(`Missing: ${missing.join(", ")}`);
  }
  for (const issue of invalid) {
    console.error(`Invalid: ${issue}`);
  }
  process.exit(1);
}

console.log("Production deploy preflight passed.");
if (vercelManagedOnly.length > 0) {
  console.log(`Vercel-managed values present but not readable locally: ${vercelManagedOnly.join(", ")}.`);
}
