// GET /api/me, PATCH /api/me — spec §4 row for `profile`.

import { Hono } from "npm:hono@4";
import type { AppVariables } from "../types.ts";
import { pickAllowed, USERS_PATCHABLE_COLUMNS } from "../../_shared/patchableColumns.ts";

const app = new Hono<{ Variables: AppVariables }>();

app.get("/", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

app.patch("/", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const patch = pickAllowed(body, USERS_PATCHABLE_COLUMNS);

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No patchable fields in body" }, 400);
  }

  const { data, error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

export default app;
