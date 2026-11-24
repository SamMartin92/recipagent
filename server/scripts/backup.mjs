// Nightly backup of foodbrain.db.
// Usage: node backup.mjs <backup-folder>
// Makes a clean copy named foodbrain-YYYY-MM-DD.db and keeps the last 14.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const KEEP_DAYS = 14;

const dbPath = fileURLToPath(new URL("../foodbrain.db", import.meta.url));
const backupDir = process.argv[2];

if (!backupDir) {
  console.error("Usage: node backup.mjs <backup-folder>");
  process.exit(1);
}

mkdirSync(backupDir, { recursive: true });

const today = new Date().toISOString().slice(0, 10); // e.g. 2026-11-24
const dest = join(backupDir, `foodbrain-${today}.db`);

if (existsSync(dest)) rmSync(dest); // VACUUM INTO won't overwrite

// VACUUM INTO writes a consistent copy, even if the server is writing right now.
const db = new DatabaseSync(dbPath);
db.exec(`VACUUM INTO '${dest.replaceAll("'", "''")}'`);
db.close();
console.log(`Backed up to ${dest}`);

// Delete backups beyond the newest KEEP_DAYS.
const old = readdirSync(backupDir)
  .filter((f) => /^foodbrain-\d{4}-\d{2}-\d{2}\.db$/.test(f))
  .sort()
  .reverse()
  .slice(KEEP_DAYS);
for (const f of old) {
  rmSync(join(backupDir, f));
  console.log(`Removed old backup ${f}`);
}