-- Scoring batch release B (B6; design/scoring/SCORING.md decision 7): Emotional Singing's Expression scores, stored.
-- recordSkillScore pushed them onto progress.expressionScores and saveProgress sent them, but user_progress had no
-- column and PATCH /me/progress keeps only PROGRESS_PATCHABLE_COLUMNS, silently: no Expression score ever reached the
-- server (SCORING_SURVEY.md item 2), so the Skill Profile's Expression ring stayed empty. From release B the score is the
-- level shape (B5); the Skill Profile reads the last 20. The client keeps the last 20 (as pitch_scores); written through
-- PATCH /me/progress in the user's own row, like the other score lists: no new RLS.
-- Applied to production with release B's deploy, not before.
alter table public.user_progress add column expression_scores jsonb not null default '[]'::jsonb;

comment on column public.user_progress.expression_scores is
  'the last 20 Emotional Singing Expression scores, 0-100, the level shape from release B (client-written)';
