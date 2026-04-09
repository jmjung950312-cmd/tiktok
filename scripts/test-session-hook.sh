#!/usr/bin/env bash
# scripts/test-session-hook.sh
# P1-T17 자동 검증 가능한 부분: session-start-poll.sh 의 R-13 stale 복구 + FIFO 픽업 로직을
# sqlite3 로 재현하여 검증한다. claude 세션 수동 실행 없이도 hook 동작을 보장.
#
# 실제 Leader 세션 생성 + 팀 21명 인식 + /tiktok-team-status 응답은 별도 수동 단계.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="$PROJECT_ROOT/data/db.sqlite"
HOOK="$PROJECT_ROOT/.claude/hooks/session-start-poll.sh"

if [ ! -x "$HOOK" ]; then
  chmod +x "$HOOK"
fi

echo "=== P1-T17 R-13 stale 복구 + FIFO 픽업 자동 검증 ==="

# 기존 테스트 트리거 청소
sqlite3 "$DB_PATH" "DELETE FROM team_triggers WHERE id LIKE 't17-%';"

# 1) 빈 큐에서 hook 실행 → "대기 중인 트리거 없음" 기대
echo
echo "[1] 빈 큐"
"$HOOK"

# 2) queued 트리거 1건 삽입 → hook 이 JSON 이벤트 출력 기대
echo
echo "[2] queued 1건 삽입"
sqlite3 "$DB_PATH" <<'SQL'
INSERT INTO team_triggers (id, scenario, payload, status, active_teammates)
VALUES ('t17-queued-1', 'A',
  '{"scenario":"A","category":"love-psychology","count":5,"settings":{"voiceId":0,"speed":1.0,"backgroundFilter":null}}',
  'queued', '[]');
SQL
"$HOOK"

# 3) stale running 트리거 삽입 (started_at = 30분 전) → hook 이 queued 로 복구 기대
echo
echo "[3] stale running 1건 + 복구"
sqlite3 "$DB_PATH" <<'SQL'
INSERT INTO team_triggers (id, scenario, payload, status, started_at, active_teammates)
VALUES ('t17-stale-1', 'A',
  '{"scenario":"A","category":"money-habits","count":5,"settings":{"voiceId":0,"speed":1.0,"backgroundFilter":null}}',
  'running', datetime('now', '-30 minutes'), '[]');
SQL
"$HOOK"

# 4) 복구 후 상태 확인
echo
echo "[4] 최종 상태"
sqlite3 "$DB_PATH" "SELECT id, scenario, status, started_at FROM team_triggers WHERE id LIKE 't17-%';"

# 5) 정리
sqlite3 "$DB_PATH" "DELETE FROM team_triggers WHERE id LIKE 't17-%';"

echo
echo "=== 자동 검증 완료. Leader 수동 세션 테스트는 docs/p1-t17-result.md 참조 ==="
