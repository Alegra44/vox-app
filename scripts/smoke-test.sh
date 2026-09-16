#!/usr/bin/env bash
# Phase 1 smoke test — exercises the API layer (§4) end to end via curl,
# deliberately without the client, per the migration plan's step 2
# ("Test against Postman/curl, not the client").
#
# Usage:
#   export SUPABASE_URL=https://<ref>.supabase.co
#   export SUPABASE_ANON_KEY=...
#   export SUPABASE_SERVICE_ROLE_KEY=...   # admin-creates a pre-confirmed test user
#   ./scripts/smoke-test.sh
#
# Creates throwaway, pre-confirmed test users via the Auth admin API (so this
# doesn't depend on the project's "confirm email" dashboard setting), then
# walks every §4 endpoint except billing, which needs a real Stripe test-mode
# setup — see scripts/smoke-test-billing.md.

set -euo pipefail

: "${SUPABASE_URL:?Set SUPABASE_URL, e.g. https://abcd1234.supabase.co}"
: "${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"

API="${SUPABASE_URL}/functions/v1/api"
AUTH="${SUPABASE_URL}/auth/v1"
EMAIL="voxcoach-smoketest+$(date +%s)@example.com"
PASSWORD="SmokeTest123!"

pass() { echo "  OK  $1"; }
fail() { echo "FAIL  $1"; exit 1; }

create_and_login() {
  local email="$1"
  curl -sS -X POST "$AUTH/admin/users" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" > /dev/null

  local login
  login=$(curl -sS -X POST "$AUTH/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}")
  echo "$login" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4
}

echo "== 1. Create + sign in test user ($EMAIL) =="
TOKEN=$(create_and_login "$EMAIL")
[ -n "$TOKEN" ] || fail "could not obtain access_token for $EMAIL"
pass "got access token"

AUTH_HDR="Authorization: Bearer $TOKEN"

echo "== 2. GET /me (should exist via signup trigger) =="
ME=$(curl -sS -H "$AUTH_HDR" "$API/me")
echo "$ME" | grep -q "\"email\":\"$EMAIL\"" && pass "GET /me returns the new user" || fail "GET /me: $ME"

echo "== 3. PATCH /me =="
PATCHED=$(curl -sS -X PATCH -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"name":"Smoke Test","exercise_level":"intermediate","subscription_plan":"choir"}' \
  "$API/me")
echo "$PATCHED" | grep -q '"name":"Smoke Test"' || fail "PATCH /me name: $PATCHED"
echo "$PATCHED" | grep -q '"exercise_level":"intermediate"' || fail "PATCH /me exercise_level: $PATCHED"
echo "$PATCHED" | grep -q '"subscription_plan":null' \
  && pass "PATCH /me applied allowed fields and silently dropped subscription_plan (§6.3 security boundary)" \
  || fail "subscription_plan should NOT be client-settable: $PATCHED"

echo "== 4. GET /me/progress (row should exist via signup trigger) =="
PROGRESS=$(curl -sS -H "$AUTH_HDR" "$API/me/progress")
echo "$PROGRESS" | grep -q '"xp":0' && pass "GET /me/progress returns defaults" || fail "GET /me/progress: $PROGRESS"

echo "== 5. PATCH /me/progress (merge-patch) =="
curl -sS -X PATCH -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"xp":40,"streak":2}' "$API/me/progress" > /dev/null
PROGRESS2=$(curl -sS -H "$AUTH_HDR" "$API/me/progress")
echo "$PROGRESS2" | grep -q '"xp":40' || fail "xp not updated: $PROGRESS2"
curl -sS -X PATCH -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"streak":5}' "$API/me/progress" > /dev/null
PROGRESS3=$(curl -sS -H "$AUTH_HDR" "$API/me/progress")
echo "$PROGRESS3" | grep -q '"xp":40' && echo "$PROGRESS3" | grep -q '"streak":5' \
  && pass "merge-patch left xp untouched while updating streak" \
  || fail "merge-patch didn't merge correctly: $PROGRESS3"

echo "== 6. GET/PATCH /me/preferences =="
curl -sS -X PATCH -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"language":"fr"}' "$API/me/preferences" > /dev/null
PREF=$(curl -sS -H "$AUTH_HDR" "$API/me/preferences")
echo "$PREF" | grep -q '"language":"fr"' && pass "preferences round-trip" || fail "preferences: $PREF"

echo "== 7. Teacher: create student, assignment, toggle completion =="
STUDENT=$(curl -sS -X POST -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"name":"Test Student"}' "$API/teacher/students")
STUDENT_ID=$(echo "$STUDENT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$STUDENT_ID" ] || fail "create student: $STUDENT"
pass "created student $STUDENT_ID"

ASSIGNMENT=$(curl -sS -X POST -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"exerciseType":"pitch_glider","note":"daily warmup"}' "$API/teacher/assignments")
ASSIGNMENT_ID=$(echo "$ASSIGNMENT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$ASSIGNMENT_ID" ] || fail "create assignment: $ASSIGNMENT"
pass "created assignment $ASSIGNMENT_ID"

TOGGLE1=$(curl -sS -X PATCH -H "$AUTH_HDR" "$API/teacher/assignments/$ASSIGNMENT_ID/completions/$STUDENT_ID")
echo "$TOGGLE1" | grep -q '"completed":true' || fail "first toggle should complete: $TOGGLE1"
TOGGLE2=$(curl -sS -X PATCH -H "$AUTH_HDR" "$API/teacher/assignments/$ASSIGNMENT_ID/completions/$STUDENT_ID")
echo "$TOGGLE2" | grep -q '"completed":false' || fail "second toggle should un-complete: $TOGGLE2"
pass "completion toggles both ways"

curl -sS -X DELETE -H "$AUTH_HDR" "$API/teacher/students/$STUDENT_ID" -o /dev/null -w '%{http_code}' | grep -q 204 \
  && pass "deleted student" || fail "delete student did not return 204"

echo "== 8. Cross-user isolation (RLS) =="
EMAIL2="voxcoach-smoketest+$(date +%s)b@example.com"
TOKEN2=$(create_and_login "$EMAIL2")
[ -n "$TOKEN2" ] || fail "could not obtain access_token for $EMAIL2"
ME2=$(curl -sS -H "Authorization: Bearer $TOKEN2" "$API/me")
echo "$ME2" | grep -q "\"email\":\"$EMAIL2\"" && ! echo "$ME2" | grep -q "$EMAIL" \
  && pass "second user only ever sees their own row" || fail "cross-user leak: $ME2"

echo "== 9. POST /api/feedback (public, signed out) =="
FB=$(curl -sS -X POST -H "Content-Type: application/json" \
  -d '{"liked":"the tuner","rating":5}' "$API/feedback" -w '\n%{http_code}')
FB_CODE=$(echo "$FB" | tail -1)
[ "$FB_CODE" = "201" ] && pass "signed-out feedback submission accepted" || fail "POST /api/feedback: $FB"

echo "== 10. POST /api/feedback rejects out-of-range rating =="
FB2_CODE=$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" \
  -d '{"rating":9}' "$API/feedback")
[ "$FB2_CODE" = "400" ] && pass "out-of-range rating rejected" || fail "expected 400, got $FB2_CODE"

echo ""
echo "All smoke tests passed."
