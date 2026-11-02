import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";

const server = createApp().listen(config.port, () => {
  console.log(`[http] listening on :${config.port}`);
});

// Fly.io sends SIGTERM before stopping a machine (e.g. during a deploy).
// Stop accepting new requests, let in-flight ones finish, then close the
// database pool so no query is cut off halfway.
function shutdown(signal: string) {
  console.log(`[http] ${signal} received, shutting down`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  // Don't hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
