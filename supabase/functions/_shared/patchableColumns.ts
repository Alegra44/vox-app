/**
 * Allow-lists for merge-patch endpoints (§4's "accept a partial object and
 * merge server-side" decision). Only listed keys are ever written — anything
 * else in the request body is silently dropped, which also closes the hole
 * where a client could otherwise set e.g. subscription_plan for free (§6.3).
 */

export const USERS_PATCHABLE_COLUMNS = [
  "name",
  "exercise_level",
  "genre",
  "onboarding_singer_type",
  "onboarding_priority",
  "onboarding_goals",
  "day1_start_date",
  "day1_goal",
  "day1_snapshot",
  // subscription_plan and stripe_customer_id are intentionally excluded:
  // per spec §6.3 those may only be set server-side, from the Stripe webhook.
] as const;

export const PROGRESS_PATCHABLE_COLUMNS = [
  "xp",
  "streak",
  "total_sessions",
  "last_practice_date",
  "last_exercise_date",
  "lowest_midi",
  "highest_midi",
  "breakthrough_count",
  "curriculum_days_completed",
  "pitch_scores",
  "agility_scores",
  "breath_scores",
  "note_attempt_history",
  "daily_metrics",
  "weekly_log",
  "timeline_events",
  "notified_achievements",
  "one_take_history",
  "one_take_last_date",
  "song_best_scores",
  "session_snapshot",
  "history",
  "daily_weighting",
  "exercises_today",
  "warmups_completed",
  "boss_victories",
  "last_boss_weakness",
  "glider_best",
  "bridge_best",
  "harmony_best",
  "rift_best",
  "best_breath_duration",
  "best_bridge_seconds",
  "tried_karaoke",
  "tried_emotion",
  "used_choir_solo",
  "used_key_recommendation",
] as const;

export function pickAllowed(
  body: Record<string, unknown>,
  allowed: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      out[key] = body[key];
    }
  }
  return out;
}
