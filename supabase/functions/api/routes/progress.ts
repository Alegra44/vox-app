// GET /api/me/progress, PATCH /api/me/progress — spec §4 row for `progress`.
//
// PATCH is a real merge-patch (spec §4's "one real implementation decision"):
// the client sends only the fields it changed — mirroring `progress.xp = ...;
// saveProgress()` — and Postgres/PostgREST's partial UPDATE leaves every
// other column untouched.

import { Hono } from "npm:hono@4";
import type { AppVariables } from "../types.ts";
import { pickAllowed, PROGRESS_PATCHABLE_COLUMNS } from "../../_shared/patchableColumns.ts";

const app = new Hono<{ Variables: AppVariables }>();

app.get("/", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");

  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

app.patch("/", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const patch = pickAllowed(body, PROGRESS_PATCHABLE_COLUMNS);

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No patchable fields in body" }, 400);
  }

  // Release J (design/reliability/RELEASE_J.md, J1): if_version, the row's version the page last saw (0012). Given,
  // the update is made only if the row is still at that version; otherwise 409 with the row as it is, for the page to
  // merge and send again. Absent (an older app, a page open since before the deploy, a rollback of the app), the
  // update is made as before J: last writer wins. save_id is kept as last_save_id (the trigger keeps the last 8).
  const ifVersion = typeof body.if_version === "number" ? body.if_version : null;
  if (typeof body.save_id === "string") patch.last_save_id = body.save_id;
  let q = supabase.from("user_progress").update(patch).eq("user_id", userId);
  if (ifVersion !== null) q = q.eq("version", ifVersion);
  const { data, error } = await q.select().maybeSingle();

  if (error) return c.json({ error: error.message }, 400);
  if (!data) {
    const { data: row, error: e2 } = await supabase.from("user_progress").select("*").eq("user_id", userId).single();
    if (e2) return c.json({ error: e2.message }, 404);
    return c.json({ error: "version conflict", row }, 409);
  }
  return c.json(data);
});

export default app;
