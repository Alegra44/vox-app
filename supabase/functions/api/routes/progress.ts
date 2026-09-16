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

  const { data, error } = await supabase
    .from("user_progress")
    .update(patch)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

export default app;
