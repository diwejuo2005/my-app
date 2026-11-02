import express, { type ErrorRequestHandler } from "express";
import { pool } from "./db.js";

// Built separately from index.ts (which listens on a port) so tests can
// exercise the app directly without starting a real server.
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  // Used by Fly.io to decide whether this machine is healthy, and by us to
  // check a deploy: the server is up AND can reach the database.
  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "ok" });
    } catch {
      res.status(503).json({ status: "degraded", db: "unreachable" });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  // Express 5 forwards errors thrown in async handlers here automatically.
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error("[http] unhandled error:", err);
    res.status(500).json({ error: "internal_error" });
  };
  app.use(onError);

  return app;
}
