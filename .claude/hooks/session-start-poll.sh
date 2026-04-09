#!/usr/bin/env bash
# session-start-poll.sh
# Leader 세션 시작 시 team_triggers 큐를 점검한다.
# (1) R-13 stale 복구: 15분 이상 running 상태로 방치된 트리거를 queued로 되돌림
# (2) FIFO 조회(R-14): 가장 오래된 queued 트리거 1건을 Leader stdout에 출력
#
# 호출 방법: SessionStart 이벤트 hook으로 .claude/settings.json에 등록됨.
# 직접 실행: ./.claude/hooks/session-start-poll.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_PATH="$PROJECT_ROOT/data/db.sqlite"

# DB 없으면 조용히 종료(최초 셋업 전 상태)
if [ ! -f "$DB_PATH" ]; then
  exit 0
fi

# (1) R-13 stale running 복구 (15분 임계)
RECOVERED=$(sqlite3 "$DB_PATH" "
  UPDATE team_triggers
     SET status = 'queued', started_at = NULL
   WHERE status = 'running'
     AND datetime(started_at) < datetime('now', '-15 minutes');
  SELECT changes();
")

if [ "${RECOVERED:-0}" -gt 0 ]; then
  echo "[session-start-poll] R-13 stale 복구: ${RECOVERED}건 queued로 되돌림"
fi

# (2) FIFO 다음 트리거 1건 조회
NEXT_TRIGGER=$(sqlite3 -separator '|' "$DB_PATH" "
  SELECT id, scenario, payload
    FROM team_triggers
   WHERE status = 'queued'
   ORDER BY created_at ASC
   LIMIT 1;
")

if [ -n "$NEXT_TRIGGER" ]; then
  TRIGGER_ID=$(echo "$NEXT_TRIGGER" | cut -d'|' -f1)
  SCENARIO=$(echo "$NEXT_TRIGGER" | cut -d'|' -f2)
  PAYLOAD=$(echo "$NEXT_TRIGGER" | cut -d'|' -f3-)

  # Leader에게 전달: stdout으로 JSON 한 줄 출력
  printf '{"event":"next-queued-trigger","triggerId":"%s","scenario":"%s","payload":%s}\n' \
    "$TRIGGER_ID" "$SCENARIO" "$PAYLOAD"
else
  echo "[session-start-poll] 대기 중인 트리거 없음"
fi

exit 0
