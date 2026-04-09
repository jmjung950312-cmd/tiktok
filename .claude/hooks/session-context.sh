#!/usr/bin/env bash
# .claude/hooks/session-context.sh
#
# SessionStart hook — 세션 시작 시 프로젝트 상태 스냅샷을 stdout 으로 출력.
# Claude Code 는 stdout 을 "additionalContext" 로 간주하여 대화 초반에 주입한다.
#
# 동작 원칙:
#   1) 모든 섹션을 `|| true` 로 감싸서 한 부분 실패해도 전체 출력 계속
#   2) stderr 로만 에러 출력, stdout 은 순수 Markdown
#   3) 8,000자 이내 유지 (Claude 컨텍스트 낭비 방지)
#   4) set -e 는 생략 (실패 허용)
#
# 주의: 같은 SessionStart 배열의 session-start-poll.sh 가 JSON 한 줄을 출력하지만,
# 이 hook 의 마크다운 출력과는 명확히 구분되므로 파싱 충돌 없음.

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

ROOT="$(hooks_project_root)"
cd "$ROOT" 2>/dev/null || { exit 0; }

# 오래된 편집 플래그 청소 (crash 누수 방지)
hooks_cleanup_stale_flags || true

# 현재 시각 (로컬 TZ)
NOW="$(date '+%Y-%m-%d %H:%M')"

# -----------------------------------------------------------------------------
# 헤더
# -----------------------------------------------------------------------------
printf '## 🎬 TikTok 파이프라인 세션 컨텍스트 — %s\n\n' "$NOW"

# -----------------------------------------------------------------------------
# 📊 운영 상태 (DB 쿼리)
# -----------------------------------------------------------------------------
DB="$ROOT/data/db.sqlite"
if [ -f "$DB" ]; then
  printf '### 📊 운영 상태\n'
  TRIGGERS=$(sqlite3 "$DB" "
    SELECT
      SUM(CASE WHEN status='queued' THEN 1 ELSE 0 END) AS q,
      SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) AS r,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS c,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS f
    FROM team_triggers
    WHERE datetime(created_at) > datetime('now','-7 days');
  " 2>/dev/null || echo "")
  if [ -n "$TRIGGERS" ]; then
    Q=$(echo "$TRIGGERS" | cut -d'|' -f1)
    R=$(echo "$TRIGGERS" | cut -d'|' -f2)
    C=$(echo "$TRIGGERS" | cut -d'|' -f3)
    F=$(echo "$TRIGGERS" | cut -d'|' -f4)
    printf -- '- team_triggers (최근 7일): queued=%s, running=%s, completed=%s, failed=%s\n' \
      "${Q:-0}" "${R:-0}" "${C:-0}" "${F:-0}"
  fi

  RUNNING_JOB=$(sqlite3 "$DB" "
    SELECT id || '|' || category || '|' || status
      FROM jobs
     WHERE status='running'
     ORDER BY created_at DESC LIMIT 1;
  " 2>/dev/null || echo "")
  if [ -n "$RUNNING_JOB" ]; then
    printf -- '- 진행 중 잡: `%s`\n' "$RUNNING_JOB"
  fi

  PROPOSED=$(sqlite3 "$DB" "SELECT COUNT(*) FROM prompt_changes WHERE status='proposed';" 2>/dev/null || echo "0")
  if [ "${PROPOSED:-0}" -gt 0 ]; then
    printf -- '- ⚠️ 승인 대기 prompt_changes: **%s건**\n' "$PROPOSED"
  fi
  printf '\n'
else
  printf '### 📊 운영 상태\n- DB 파일 없음 (`data/db.sqlite`) — 초기 셋업 상태\n\n'
fi

# -----------------------------------------------------------------------------
# 🔀 Git 최근 변경 (최근 커밋 5개)
# -----------------------------------------------------------------------------
if git rev-parse --git-dir >/dev/null 2>&1; then
  printf '### 🔀 최근 커밋 (git log -5)\n'
  git log -5 --format='- `%h` %s _(%cr, %an)_' 2>/dev/null || printf -- '- (로그 없음)\n'
  printf '\n'

  # 미커밋 변경 요약
  CHANGED=$(git status --short 2>/dev/null | head -15)
  if [ -n "$CHANGED" ]; then
    printf '### 📝 미커밋 변경 (git status --short, 최대 15줄)\n```\n%s\n```\n\n' "$CHANGED"
  fi

  # 현재 브랜치
  BRANCH=$(git branch --show-current 2>/dev/null || echo "?")
  printf -- '- 🌿 현재 브랜치: `%s`\n\n' "$BRANCH"
else
  # Fallback: mtime 기반 최근 수정 파일
  printf '### 📁 최근 수정 파일 Top 5 (mtime)\n'
  find . -type f \
    -not -path '*/node_modules/*' \
    -not -path '*/.next/*' \
    -not -path '*/.venv/*' \
    -not -path '*/data/*' \
    -not -path '*/.git/*' \
    -not -path '*/.shrimp_data/*' \
    -not -path '*/assets/backgrounds/*' \
    -not -path '*/assets/bgm/*' \
    -printf '%T@ %p\n' 2>/dev/null \
    | sort -rn | head -5 | awk '{printf "- %s\n", $2}' || true
  printf '\n'
fi

# -----------------------------------------------------------------------------
# 🎯 Phase 진행 (docs/p1-*, p2-*)
# -----------------------------------------------------------------------------
if [ -d "docs" ]; then
  printf '### 🎯 Phase 진행 (docs/p1-*, p2-*)\n'
  find docs -maxdepth 1 -name 'p[0-9]-*.md' -type f 2>/dev/null \
    | sort \
    | head -10 \
    | while read -r f; do
        name="$(basename "$f")"
        printf -- '- %s\n' "$name"
      done
  printf '\n'
fi

# -----------------------------------------------------------------------------
# 🧠 Memory 헤드라인 (MEMORY.md)
# -----------------------------------------------------------------------------
MEMORY_MD="$HOME/.claude/projects/-Users-jungmo-Developer-Claude-Core-tiktok-automation-2026-04-08/memory/MEMORY.md"
if [ -f "$MEMORY_MD" ]; then
  printf '### 🧠 Memory 헤드라인\n'
  # MEMORY.md 의 `-` 로 시작하는 라인만 추출 (최대 10줄)
  grep -E '^- ' "$MEMORY_MD" 2>/dev/null | head -10 || true
  printf '\n'
fi

# -----------------------------------------------------------------------------
# ⚙️ 활성 Hook 요약
# -----------------------------------------------------------------------------
HOOKS_DIR="$ROOT/.claude/hooks"
if [ -d "$HOOKS_DIR" ]; then
  printf '### ⚙️ 활성 Hook\n'
  for h in session-start-poll session-context pre-tool-guard post-format stop-validate; do
    if [ -x "$HOOKS_DIR/$h.sh" ] || [ -f "$HOOKS_DIR/$h.sh" ]; then
      printf -- '- `%s.sh` ✅\n' "$h"
    fi
  done
  printf '\n'
fi

# -----------------------------------------------------------------------------
# 💡 팁 (옵션)
# -----------------------------------------------------------------------------
printf '### 💡 사용 팁\n'
printf -- '- 시나리오 A: `/tiktok-generate <카테고리>`\n'
printf -- '- 시나리오 B (plan 모드): `/tiktok-dev <요청>`\n'
printf -- '- 시나리오 C (주간 분석): `/tiktok-analyze`\n'
printf -- '- 상태 조회: `/tiktok-team-status`\n'

exit 0
