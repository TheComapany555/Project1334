#!/usr/bin/env bash
# Mark all local migrations as ALREADY APPLIED on the linked remote, except the
# two mobile-auth patches — then `db push` will only run those two SQL files.
#
# Prerequisites: `supabase link` done for this project; run from Project1334 root:
#   chmod +x scripts/baseline-migrations-then-push.sh
#   ./scripts/baseline-migrations-then-push.sh
#
# If repair fails (CLI version / duplicate timestamps), use instead:
#   scripts/apply-mobile-auth-patches-only.sql in the Supabase SQL Editor.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"

SKIP1="20260329120000_auth_tokens_mobile_email_otp.sql"
SKIP2="20260329130000_profiles_role_allow_user.sql"

cd "$ROOT"

for f in "$MIGRATIONS"/*.sql; do
  base="$(basename "$f")"
  if [[ "$base" == "$SKIP1" || "$base" == "$SKIP2" ]]; then
    continue
  fi
  # Supabase repair expects the version id = filename without .sql
  ver="${base%.sql}"
  echo "Marking applied: $ver"
  supabase migration repair --status applied "$ver"
done

echo ""
echo "Now run: supabase db push"
echo "(Should apply only $SKIP1 and $SKIP2)"
