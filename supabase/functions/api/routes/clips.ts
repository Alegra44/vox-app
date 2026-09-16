// POST /api/me/clips (multipart) — spec §3.5 / §4.
// Uploads the audio blob to Storage (bucket "voice-clips") and writes only
// the reference row to Postgres, replacing the base64-in-jsonb prototype
// shortcut called out in §3.5.

import { Hono } from "npm:hono@4";
import type { AppVariables } from "../types.ts";

const app = new Hono<{ Variables: AppVariables }>();

const VALID_CONTEXTS = ["day1", "today", "studio_take"];

app.post("/", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");

  const form = await c.req.formData();
  const file = form.get("file");
  const context = form.get("context");

  if (!(file instanceof File)) {
    return c.json({ error: "file is required (multipart field 'file')" }, 400);
  }
  if (typeof context !== "string" || !VALID_CONTEXTS.includes(context)) {
    return c.json({ error: `context must be one of ${VALID_CONTEXTS.join(", ")}` }, 400);
  }

  const ext = (file.name.split(".").pop() || "webm").toLowerCase();
  const objectPath = `${userId}/${context}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("voice-clips")
    .upload(objectPath, file, { contentType: file.type });

  if (uploadError) return c.json({ error: uploadError.message }, 400);

  const { data, error } = await supabase
    .from("voice_clips")
    .insert({
      user_id: userId,
      context,
      storage_path: objectPath,
      mime_type: file.type,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data, 201);
});

export default app;
