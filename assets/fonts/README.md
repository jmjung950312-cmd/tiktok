# 폰트 풀 (`assets/fonts/`)

## 현재 상태

- **Pretendard-Bold.otf 없음** — 사용자가 수동 다운로드해야 함

## 요구 사양

- **Pretendard Bold (.otf 또는 .ttf)**, 한국어 자막 전용 폰트
- 크기: ~2~3MB
- 라이선스: OFL-1.1 (상업/무료 사용 가능)

## 다운로드 방법

### GitHub 릴리스에서 직접 (권장)

```bash
cd assets/fonts
curl -L -o Pretendard-1.3.9.zip \
  https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip
unzip -j Pretendard-1.3.9.zip "Pretendard-1.3.9/public/static/Pretendard-Bold.otf"
rm Pretendard-1.3.9.zip
ls -lh Pretendard-Bold.otf
```

최신 버전은 https://github.com/orioncactus/pretendard/releases 에서 확인.

## 용도

`lib/pipeline/subtitle.ts`가 `assets/styles/subtitle.ass` 템플릿에 `Fontname: Pretendard`로 참조.
FFmpeg의 `-vf ass=...` 필터가 시스템 폰트 룩업을 수행하므로 macOS에서는 `/Library/Fonts/` 또는 `~/Library/Fonts/`에 복사 설치가 필요할 수 있음 (Phase 1 T17~T18 실측).

### 폰트 설치 방법 (macOS)

```bash
cp assets/fonts/Pretendard-Bold.otf ~/Library/Fonts/
fc-cache -f -v 2>/dev/null || true
```
