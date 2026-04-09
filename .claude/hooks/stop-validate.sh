#!/usr/bin/env bash
# .claude/hooks/stop-validate.sh
#
# Stop hook — Claude 응답 완료 직전에 품질 게이트.
# 편집이 있었던 세션에만 typecheck + lint 실행.
# 실패 시 {"decision":"block", "reason":"..."} JSON 응답으로 응답 중단.
#
# 동작 원칙:
#   - stop_hook_active=true 면 즉시 종료 (무한루프 방지)
#   - 편집 플래그 없으면 즉시 종료 (읽기만 한 세션 스킵)
#   - 각 검사 timeout 60초
#   - 성공 시 플래그 삭제
#   - set -e 사용 금지 (JSON 응답 생성 경로 보존)

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

INPUT="$(cat)"
[ -z "$INPUT" ] && exit 0

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "")
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")

# 무한루프 방지: 이미 block 으로 한 번 재시도 중이면 통과
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  hooks_log "stop-validate.skip.recursive" "{}"
  exit 0
fi

# 편집 플래그 확인 — 없으면 검사 스킵
FLAG="$(hooks_edit_flag_path "$SESSION_ID")"
if [ ! -f "$FLAG" ]; then
  hooks_log "stop-validate.skip.no-edit" "$(jq -n --arg s "$SESSION_ID" '{session:$s}')"
  exit 0
fi

ROOT="$(hooks_project_root)"
cd "$ROOT" || exit 0

# -----------------------------------------------------------------------------
# 1) typecheck
# -----------------------------------------------------------------------------
TC_OUT=$(timeout 60 npm run typecheck 2>&1)
TC_STATUS=$?
if [ $TC_STATUS -ne 0 ]; then
  # 출력 끝 30줄 + 이유 가공
  TAIL=$(printf '%s\n' "$TC_OUT" | tail -30)
  hooks_stop_block "Type check 실패 — 수정 후 다시 시도하세요:\n\n$TAIL"
  hooks_log "stop-validate.typecheck.fail" "$(jq -n --arg tail "$TAIL" --arg status "$TC_STATUS" '{tail:$tail, exit:$status}')"
  exit 0
fi

# -----------------------------------------------------------------------------
# 2) lint
# -----------------------------------------------------------------------------
LINT_OUT=$(timeout 60 npm run lint 2>&1)
LINT_STATUS=$?
if [ $LINT_STATUS -ne 0 ]; then
  TAIL=$(printf '%s\n' "$LINT_OUT" | tail -30)
  hooks_stop_block "Lint 실패 — 수정 후 다시 시도하세요:\n\n$TAIL"
  hooks_log "stop-validate.lint.fail" "$(jq -n --arg tail "$TAIL" --arg status "$LINT_STATUS" '{tail:$tail, exit:$status}')"
  exit 0
fi

# -----------------------------------------------------------------------------
# 모두 통과 — 플래그 삭제
# -----------------------------------------------------------------------------
rm -f "$FLAG" 2>/dev/null || true
hooks_log "stop-validate.pass" "$(jq -n --arg s "$SESSION_ID" '{session:$s}')"
exit 0
