#!/usr/bin/env bash
# .claude/hooks/post-format.sh
#
# PostToolUse hook — Write / Edit / MultiEdit 직후 자동 포맷 + 편집 플래그 생성.
# - ts/tsx/js/jsx/mjs/cjs → prettier --write + eslint --fix
# - json/md/yaml/yml/css → prettier --write
# - 기타 확장자 → 스킵
#
# 주의:
#   - exit 0 보장 (non-blocking)
#   - 포맷 실패해도 워크플로 계속
#   - .prettierignore 가 알아서 data/.venv/node_modules 등 제외

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

INPUT="$(cat)"
[ -z "$INPUT" ] && exit 0

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || echo "")
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

ROOT="$(hooks_project_root)"

# 편집 플래그 생성 (Stop hook 이 검사 대상 결정용으로 사용)
if [ -n "$SESSION_ID" ]; then
  mkdir -p "$ROOT/.claude/logs" 2>/dev/null || true
  touch "$(hooks_edit_flag_path "$SESSION_ID")" 2>/dev/null || true
fi

# 파일 경로 없으면 플래그만 남기고 종료
[ -z "$FILE_PATH" ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

# .prettierignore 체크는 prettier 자체가 처리하므로 중복 확인 불필요
# 확장자 기반 분기
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    (
      cd "$ROOT" || exit 0
      # prettier --write (실패해도 계속)
      npx --no-install prettier --write "$FILE_PATH" 2>/dev/null || true
      # eslint --fix (실패해도 계속)
      npx --no-install eslint --fix --quiet "$FILE_PATH" 2>/dev/null || true
    )
    hooks_log "post-format.ts" "$(jq -n --arg file "$FILE_PATH" --arg tool "$TOOL_NAME" '{file:$file, tool:$tool}')"
    ;;
  *.json|*.md|*.yaml|*.yml|*.css|*.scss)
    (
      cd "$ROOT" || exit 0
      npx --no-install prettier --write "$FILE_PATH" 2>/dev/null || true
    )
    hooks_log "post-format.doc" "$(jq -n --arg file "$FILE_PATH" --arg tool "$TOOL_NAME" '{file:$file, tool:$tool}')"
    ;;
  *)
    # 포맷 대상 아님 (예: .sh, .py, .sql, 바이너리 등)
    hooks_log "post-format.skip" "$(jq -n --arg file "$FILE_PATH" --arg tool "$TOOL_NAME" '{file:$file, tool:$tool}')"
    ;;
esac

exit 0
