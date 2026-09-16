// Teacher endpoints — spec §4 "new" rows, backing §3.3/§3.4.
//   POST   /api/teacher/students
//   DELETE /api/teacher/students/:id
//   POST   /api/teacher/assignments
//   PATCH  /api/teacher/assignments/:id/completions/:studentId

import { Hono } from "npm:hono@4";
import type { AppVariables } from "../types.ts";

const app = new Hono<{ Variables: AppVariables }>();

app.post("/students", async (c) => {
  const supabase = c.get("supabase");
  const teacherId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));

  if (!body.name || typeof body.name !== "string") {
    return c.json({ error: "name is required" }, 400);
  }

  const { data, error } = await supabase
    .from("teacher_students")
    .insert({ teacher_id: teacherId, name: body.name })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data, 201);
});

app.delete("/students/:id", async (c) => {
  const supabase = c.get("supabase");
  const teacherId = c.get("userId");
  const id = c.req.param("id");

  const { error } = await supabase
    .from("teacher_students")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacherId);

  if (error) return c.json({ error: error.message }, 400);
  return c.body(null, 204);
});

app.post("/assignments", async (c) => {
  const supabase = c.get("supabase");
  const teacherId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));

  if (!body.exerciseType || typeof body.exerciseType !== "string") {
    return c.json({ error: "exerciseType is required" }, 400);
  }

  const { data, error } = await supabase
    .from("teacher_assignments")
    .insert({
      teacher_id: teacherId,
      exercise_type: body.exerciseType,
      note: body.note ?? null,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data, 201);
});

// Toggle: mirrors the client's current toggle-completion behavior —
// completing an already-completed assignment un-completes it.
app.patch("/assignments/:id/completions/:studentId", async (c) => {
  const supabase = c.get("supabase");
  const assignmentId = c.req.param("id");
  const studentId = c.req.param("studentId");

  const { data: existing, error: selectError } = await supabase
    .from("teacher_assignment_completions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (selectError) return c.json({ error: selectError.message }, 400);

  if (existing) {
    const { error } = await supabase
      .from("teacher_assignment_completions")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ completed: false });
  }

  const { error } = await supabase
    .from("teacher_assignment_completions")
    .insert({ assignment_id: assignmentId, student_id: studentId });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ completed: true });
});

export default app;
