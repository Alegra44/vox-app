// VoxCoach API layer — implements spec §4 (API Contract).
//
// Deployed as a single Supabase Edge Function ("api"), reachable at
//   POST/GET/PATCH/DELETE {SUPABASE_URL}/functions/v1/api/<path>
// which maps 1:1 onto the /api/<path> routes in spec §4.
//
// Every route except /billing/webhook and /feedback requires
// "Authorization: Bearer <user JWT>" and reads/writes only that user's rows —
// enforced doubly, by the route logic AND by Postgres RLS (§5.3), which is
// the real security boundary.

import { Hono } from "npm:hono@4";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserId, userClient } from "../_shared/supabaseClients.ts";
import type { AppVariables } from "./types.ts";
import me from "./routes/me.ts";
import progress from "./routes/progress.ts";
import preferences from "./routes/preferences.ts";
import teacher from "./routes/teacher.ts";
import clips from "./routes/clips.ts";
import billing from "./routes/billing.ts";
import feedback from "./routes/feedback.ts";

const app = new Hono<{ Variables: AppVariables }>().basePath("/api");

app.use("*", async (c, next) => {
  Object.entries(corsHeaders).forEach(([k, v]) => c.header(k, v));
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

// Auth gate for everything except the Stripe webhook (no user JWT — Stripe
// calls it directly and verifies itself via signature) and feedback (public,
// reachable signed out; see routes/feedback.ts).
app.use("*", async (c, next) => {
  if (c.req.path === "/api/billing/webhook" || c.req.path === "/api/feedback") {
    return next();
  }

  const authHeader = c.req.header("Authorization");
  const userId = await getUserId(authHeader ?? null);
  if (!userId || !authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", userId);
  c.set("supabase", userClient(authHeader));
  await next();
});

app.route("/me", me);
app.route("/me/progress", progress);
app.route("/me/preferences", preferences);
app.route("/teacher", teacher);
app.route("/me/clips", clips);
app.route("/billing", billing);
app.route("/feedback", feedback);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message ?? "Internal error" }, 500);
});

Deno.serve(app.fetch);
