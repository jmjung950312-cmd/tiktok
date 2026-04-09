#!/usr/bin/env bash
# scripts/install-cron-analyze.sh
# P2-T09: templates/com.tiktok.analyze.plist 를 ~/Library/LaunchAgents/ 에 설치하고 launchctl load.
# 매주 월 09:00에 scripts/cron-enqueue-weekly.sh 가 자동 실행되도록 등록한다.
#
# 사전 조건:
#   - macOS launchd
#   - sqlite3 / uuidgen 기본 제공
#   - 시나리오 C teammates(metrics-analyst, trend-analyst) 가 .claude/agents/ 에 존재
#   - tmux Leader 데몬(P2-T11) 이 가동 중이어야 queued 트리거가 실제로 실행됨

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_SRC="$PROJECT_ROOT/templates/com.tiktok.analyze.plist"
PLIST_DEST_DIR="$HOME/Library/LaunchAgents"
PLIST_DEST="$PLIST_DEST_DIR/com.tiktok.analyze.plist"
LOG_DIR="$HOME/Library/Logs"
LABEL="com.tiktok.analyze"

# 사전 검증
if [ ! -f "$PLIST_SRC" ]; then
  echo "[install-cron] 템플릿을 찾을 수 없습니다: $PLIST_SRC" >&2
  exit 1
fi
if [ ! -x "$PROJECT_ROOT/scripts/cron-enqueue-weekly.sh" ]; then
  echo "[install-cron] cron-enqueue-weekly.sh 에 실행권한이 없습니다 — chmod +x 적용 중" >&2
  chmod +x "$PROJECT_ROOT/scripts/cron-enqueue-weekly.sh"
fi
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "[install-cron] sqlite3 가 PATH 에 없습니다(macOS 기본 제공)." >&2
  exit 127
fi

mkdir -p "$PLIST_DEST_DIR" "$LOG_DIR"

# 이미 로드되어 있으면 먼저 언로드(중복 방지)
if launchctl list 2>/dev/null | grep -q "$LABEL"; then
  echo "[install-cron] 기존 $LABEL 로드 감지 — 먼저 언로드"
  launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# 플레이스홀더 치환
sed -e "s|__PROJECT_ROOT__|$PROJECT_ROOT|g" \
    -e "s|__HOME__|$HOME|g" \
    "$PLIST_SRC" > "$PLIST_DEST"

chmod 644 "$PLIST_DEST"

if ! launchctl load "$PLIST_DEST"; then
  echo "[install-cron] launchctl load 실패 — plist 내용 확인:" >&2
  cat "$PLIST_DEST" >&2
  exit 1
fi

echo "[install-cron] 설치 완료"
echo "  plist  : $PLIST_DEST"
echo "  log    : $LOG_DIR/tiktok-analyze.log"
echo "  stage  : 매주 월요일 09:00"
echo ""
echo "다음 단계:"
echo "  1) 등록 확인        : launchctl list | grep $LABEL"
echo "  2) 수동 강제 실행   : launchctl kickstart -k gui/\$(id -u)/$LABEL"
echo "  3) 결과 로그        : tail -f $LOG_DIR/tiktok-analyze.log"
echo "  4) DB 큐 확인       : sqlite3 $PROJECT_ROOT/data/db.sqlite \"SELECT id,status,created_at FROM team_triggers WHERE scenario='C' ORDER BY created_at DESC LIMIT 5;\""
echo "  5) 제거             : ./scripts/uninstall-cron-analyze.sh"
