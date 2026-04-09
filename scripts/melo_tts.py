#!/usr/bin/env python3
"""MeloTTS CLI 래퍼.

단일 문장을 한국어 wav로 합성한다. lib/providers/tts/melo-tts.ts 에서
child_process.spawn 으로 호출된다.

사용 예시:
    .venv/bin/python scripts/melo_tts.py \
        --text "안녕하세요" \
        --speaker 0 \
        --speed 1.0 \
        --out /tmp/hello.wav
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="MeloTTS 한국어 문장 → wav 합성"
    )
    parser.add_argument(
        "--text",
        required=True,
        help="합성할 한국어 문장",
    )
    parser.add_argument(
        "--speaker",
        type=int,
        default=0,
        help="화자 ID (기본 0)",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=1.0,
        help="낭독 속도 (0.8~1.3, 기본 1.0)",
    )
    parser.add_argument(
        "--out",
        required=True,
        type=Path,
        help="출력 wav 경로",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # lazy import: melo 설치 안 된 상태에서 --help 만 볼 수 있도록
    try:
        from melo.api import TTS  # type: ignore[import-not-found]
    except ImportError:
        print(
            "[에러] melo 패키지 import 실패. 'npm run setup:melo' 로 먼저 셋업하세요.",
            file=sys.stderr,
        )
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)

    model = TTS(language="KR", device="cpu")
    speaker_ids = model.hps.data.spk2id
    # 한국어는 단일 화자 KR, speaker 인자는 향후 확장용 placeholder
    speaker_key = list(speaker_ids.keys())[args.speaker]
    speaker_id = speaker_ids[speaker_key]

    model.tts_to_file(
        args.text,
        speaker_id,
        str(args.out),
        speed=args.speed,
    )

    if not args.out.exists():
        print(f"[에러] wav 파일 생성 실패: {args.out}", file=sys.stderr)
        return 2

    print(f"[OK] {args.out} ({args.out.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
