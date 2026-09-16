// POST /api/feedback — real persistence for the in-app feedback form
// (0003_feedback.sql), replacing the client-only window.storage blob.
//
// Public: reachable signed in or signed out, so it's exempted from the
// global auth gate in index.ts rather than requiring a user JWT. When a
// caller does send one, we attach user_id; otherwise it's left null.
// Insert-only — there's no GET here, matching the table's RLS (insert
// policy only, no select); the inbox is read via the dashboard/service role.

import { Hono } from "npm:hono@4";
import { anonClient, getUserId } from "../../_shared/supabaseClients.ts";

const app = new Hono();

const FEEDBACK_FIELDS = [
  "email",
  "liked",
  "disliked",
  "confusing",
  "difficult",
  "most_used",
  "improve",
  "add_feature",
  "bugs",
  "rating",
  "other_notes",
] as const;

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));

  const row: Record<string, unknown> = {};
  for (const field of FEEDBACK_FIELDS) {
    if (body[field] !== undefined) row[field] = body[field];
  }
  if (Object.keys(row).length === 0) {
    return c.json({ error: "No feedback fields in body" }, 400);
  }
  if (
    row.rating !== undefined &&
    (typeof row.rating !== "number" || row.rating < 0 || row.rating > 5)
  ) {
    return c.json({ error: "rating must be a number between 0 and 5" }, 400);
  }

  const userId = await getUserId(c.req.header("Authorization") ?? null);
  if (userId) row.user_id = userId;

  const { error } = await anonClient().from("feedback").insert(row);
  if (error) return c.json({ error: error.message }, 400);

  return c.json({ success: true }, 201);
});

export default app;
