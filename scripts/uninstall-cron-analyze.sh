#!/usr/bin/env bash
# scripts/uninstall-cron-analyze.sh
# P2-T09: com.tiktok.analyze launchd 에이전트 제거.

set -euo pipefail

PLIST_DEST="$HOME/Library/LaunchAgents/com.tiktok.analyze.plist"
LABEL="com.tiktok.analyze"

if launchctl list 2>/dev/null | grep -q "$LABEL"; then
  echo "[uninstall-cron] launchctl unload"
  launchctl unload "$PLIST_DEST" 2>/dev/null || true
else
  echo "[uninstall-cron] $LABEL 로드되어 있지 않음 (skip)"
fi

if [ -f "$PLIST_DEST" ]; then
  rm -f "$PLIST_DEST"
  echo "[uninstall-cron] plist 파일 제거: $PLIST_DEST"
else
  echo "[uninstall-cron] plist 파일 없음 (skip)"
fi

echo "[uninstall-cron] 완료"
