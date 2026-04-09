#!/usr/bin/env bash
# scripts/cron-enqueue-weekly.sh
# P2-T09: launchd 가 매주 월 09:00에 호출하여 시나리오 C 트리거를 큐에 INSERT.
# Next.js dev 서버에 의존하지 않도록 sqlite3 CLI 만 사용한다.
#
# WAL 모드라 better-sqlite3(Leader/Next.js) 와 동시 쓰기 안전.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$PROJECT_ROOT/data/db.sqlite"

# 사전 검증
if [ ! -f "$DB_PATH" ]; then
  echo "[cron-enqueue] DB 파일이 없습니다: $DB_PATH" >&2
  echo "[cron-enqueue] Next.js 서버를 한 번이라도 기동해 스키마를 초기화하거나, npx tsx scripts/init-db.ts 실행하세요." >&2
  exit 2
fi
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "[cron-enqueue] sqlite3 CLI 가 PATH 에 없습니다(macOS 기본 제공)." >&2
  exit 127
fi
if ! command -v uuidgen >/dev/null 2>&1; then
  echo "[cron-enqueue] uuidgen 이 PATH 에 없습니다(macOS 기본 제공)." >&2
  exit 127
fi

# 동일 분(分)에 중복 INSERT 방지 — 직전 5분 이내 같은 시나리오 큐가 있으면 skip.
RECENT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM team_triggers WHERE scenario='C' AND status='queued' AND datetime(created_at) > datetime('now', '-5 minutes');" 2>/dev/null || echo 0)
if [ "$RECENT" -gt 0 ]; then
  echo "[cron-enqueue] 직전 5분 내 시나리오 C queued 트리거 존재 → skip"
  exit 0
fi

UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
PAYLOAD='{"scenario":"C","period":"7d"}'

# WAL 모드 PRAGMA 명시(이미 켜져 있어도 무해), 그리고 INSERT.
# bind 파라미터는 sqlite3 CLI 가 -cmd 로 지원하지 않으므로 작은따옴표 escape 만 처리.
SQL="INSERT INTO team_triggers (id, scenario, payload, status, active_teammates) VALUES ('$UUID', 'C', '$PAYLOAD', 'queued', '[]');"

if ! sqlite3 "$DB_PATH" "$SQL"; then
  echo "[cron-enqueue] INSERT 실패" >&2
  exit 3
fi

echo "[cron-enqueue] $(date '+%Y-%m-%d %H:%M:%S') 시나리오 C queued 트리거 등록 — id=$UUID"
exit 0
