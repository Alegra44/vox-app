// GET/PATCH /api/me/preferences — spec §4 row for `language`.

import { Hono } from "npm:hono@4";
import type { AppVariables } from "../types.ts";

const app = new Hono<{ Variables: AppVariables }>();

app.get("/", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");

  const { data, error } = await supabase
    .from("users")
    .select("language")
    .eq("id", userId)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

app.patch("/", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));

  if (!["en", "fr", "es", "tr"].includes(body.language)) {
    return c.json({ error: "language must be one of en/fr/es/tr" }, 400);
  }

  const { data, error } = await supabase
    .from("users")
    .update({ language: body.language })
    .eq("id", userId)
    .select("language")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

export default app;
