// GET /api/me/vocal-load?day=YYYY-MM-DD, PUT /api/me/vocal-load/sessions/:id — Vocal Load Dosimetry (phase 2).
// Needs supabase/migrations/0005_vocal_load.sql.
//
// Both are thin wrappers over the SQL functions in 0005, which run as the caller (security invoker), so RLS and the
// table's CHECK constraints / guard trigger are the real rules; this only rejects malformed requests early.
// `day` always comes from the client (its todayStr()), so "today" has one definition across the app.

import { Hono } from "npm:hono@4";
import type { AppVariables } from "../types.ts";

const app = new Hono<{ Variables: AppVariables }>();

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const numOrNull = (v: unknown) => v === null || num(v);

app.get("/", async (c) => {
  const day = c.req.query("day");
  if (!day || !DAY.test(day)) return c.json({ error: "day must be YYYY-MM-DD" }, 400);
  const { data, error } = await c.get("supabase").rpc("vocal_load_state", { p_day: day });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

app.put("/sessions/:id", async (c) => {
  const id = c.req.param("id");
  if (!UUID.test(id)) return c.json({ error: "session id must be a uuid" }, 400);
  const b = await c.req.json().catch(() => null);
  if (!b || !DAY.test(b.day ?? "") || typeof b.startedAt !== "string" || !num(b.activeSeconds) || !num(b.load) ||
      !numOrNull(b.medianRms) || !numOrNull(b.p5Midi) || !numOrNull(b.p95Midi) || typeof b.ended !== "boolean") {
    return c.json({ error: "body: { day, startedAt, activeSeconds, load, medianRms, p5Midi, p95Midi, ended }" }, 400);
  }
  const { data, error } = await c.get("supabase").rpc("vocal_load_checkpoint", {
    p_session_id: id, p_day: b.day, p_started_at: b.startedAt, p_active_seconds: b.activeSeconds, p_load: b.load,
    p_median_rms: b.medianRms, p_p5_midi: b.p5Midi, p_p95_midi: b.p95Midi, p_ended: b.ended,
  });
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

export default app;
