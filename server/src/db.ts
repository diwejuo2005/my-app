import pg from "pg";
import { config } from "./config.js";

// A pool keeps a handful of open connections and lends one to each query,
// instead of paying for a new connection (TCP + TLS + auth) every time.
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  // Managed Postgres (Fly, Neon) requires TLS; the local Docker one doesn't.
  ssl: config.isProduction ? { rejectUnauthorized: false } : undefined,
});

// An idle connection can drop (e.g. the database restarts). Without this
// listener that error would crash the whole process.
pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});
