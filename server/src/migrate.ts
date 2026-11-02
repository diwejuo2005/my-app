import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { pool } from "./db.js";

// Schema changes live in server/migrations as numbered .sql files
// (001_users.sql, 002_auth.sql, ...). Each runs exactly once, in order, and
// is recorded in schema_migrations. Never edit a migration that has already
// run anywhere — add a new one instead.
const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);

// Any constant works; it just has to be the same for every process, so two
// machines deploying at once can't both run the same migration.
const LOCK_ID = 727274;

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await client.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name)
    );
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(new URL(file, MIGRATIONS_DIR), "utf8");
      // One transaction per file: a failing migration leaves no half-applied
      // schema behind, and isn't recorded, so it reruns after the fix.
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`[migrate] applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
    console.log("[migrate] up to date");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
}

// Run directly (`npm run migrate`, or Fly's release_command) rather than imported.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error(`[migrate] ${err.message}`);
      await pool.end();
      process.exit(1);
    });
}
