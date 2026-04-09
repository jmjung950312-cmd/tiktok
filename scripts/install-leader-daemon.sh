#!/usr/bin/env bash
# install-leader-daemon.sh
# templates/com.tiktok.leader.plist를 ~/Library/LaunchAgents/에 설치하고 launchctl load 실행.
# __PROJECT_ROOT__ / __HOME__ 플레이스홀더를 실제 절대경로로 치환.
#
# 설치 후 즉시 tmux 세션이 생성되며, 맥북 로그인 시마다 자동 재기동된다.
# 재설치가 필요하면 먼저 ./scripts/uninstall-leader-daemon.sh 실행.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_SRC="$PROJECT_ROOT/templates/com.tiktok.leader.plist"
PLIST_DEST_DIR="$HOME/Library/LaunchAgents"
PLIST_DEST="$PLIST_DEST_DIR/com.tiktok.leader.plist"
LOG_DIR="$HOME/Library/Logs"

# 사전 검증
if [ ! -f "$PLIST_SRC" ]; then
  echo "[install] 템플릿을 찾을 수 없습니다: $PLIST_SRC" >&2
  exit 1
fi
if ! command -v tmux >/dev/null 2>&1; then
  echo "[install] tmux가 설치되어 있지 않습니다. 'brew install tmux' 먼저 실행하세요." >&2
  exit 127
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "[install] claude CLI가 PATH에 없습니다. Claude Code 설치 후 다시 시도하세요." >&2
  exit 127
fi

mkdir -p "$PLIST_DEST_DIR" "$LOG_DIR"

# 이미 로드되어 있으면 먼저 언로드(중복 방지)
if launchctl list 2>/dev/null | grep -q "com.tiktok.leader"; then
  echo "[install] 기존 com.tiktok.leader 로드 감지 — 먼저 언로드"
  launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# 플레이스홀더 치환 후 복사 (sed BSD/GNU 공통)
# | 구분자로 경로에 / 포함되어도 안전
sed -e "s|__PROJECT_ROOT__|$PROJECT_ROOT|g" \
    -e "s|__HOME__|$HOME|g" \
    "$PLIST_SRC" > "$PLIST_DEST"

chmod 644 "$PLIST_DEST"
chmod +x "$PROJECT_ROOT/scripts/start-leader-tmux.sh"

# launchctl load (에러 시 diagnostic 출력)
if ! launchctl load "$PLIST_DEST"; then
  echo "[install] launchctl load 실패 — plist 내용을 확인하세요:" >&2
  cat "$PLIST_DEST" >&2
  exit 1
fi

echo "[install] 설치 완료"
echo "  plist      : $PLIST_DEST"
echo "  log        : $LOG_DIR/tiktok-leader.log"
echo "  session    : tmux attach -t tiktok-leader"
echo ""
echo "다음 단계:"
echo "  1) tmux 세션 확인    : tmux has-session -t tiktok-leader && echo OK"
echo "  2) Leader 로그 확인  : tail -f $LOG_DIR/tiktok-leader.log"
echo "  3) 대화형 접속       : tmux attach -t tiktok-leader   (detach: Ctrl-b d)"
echo "  4) 강제 재기동       : launchctl kickstart -k gui/\$(id -u)/com.tiktok.leader"
echo "  5) 제거              : ./scripts/uninstall-leader-daemon.sh"
