# BGM 풀 (`assets/bgm/`) — P2-T03

> **기술 설명**: `lib/providers/bgm.ts`가 본 디렉토리의 오디오 파일 중 랜덤으로 1개를 선택해 `lib/pipeline/video.ts`의 FFmpeg `amix` 필터에 3번째 입력으로 전달한다. BGM 0개면 `composeVideo`가 기존 2-input 경로로 폴백.
>
> **쉽게 말하면**: 여기 넣어둔 무료 음악 파일 중 하나를 영상에 자동으로 깔아줍니다. 파일 0개면 그냥 BGM 없는 영상으로 만들어지니 안심.

---

## 저작권 원칙 — CC0 / 로열티 프리만

완전 무료 원칙($0/월) 유지를 위해 **아래 3개 출처**에서 받은 음원만 사용합니다.

1. **FreePD** — https://freepd.com
   - 전량 CC0 (Public Domain). 출처 표기 불필요.
   - 장르별/무드별 검색 가능.
2. **Pixabay Music** — https://pixabay.com/music/
   - Pixabay 라이선스(상업 사용 가능, 출처 표기 불필요).
   - 다운로드 시 계정 불필요.
3. **Mixkit Free Music** — https://mixkit.co/free-stock-music/
   - 자체 Mixkit 라이선스(상업 사용 가능).

> ⚠️ **금지**: YouTube Audio Library(일부만 CC0), Bensound(상업은 유료), Epidemic Sound(유료 구독). 저작권 분쟁 리스크 때문에 리스트에서 제외.

---

## 권장 사양

| 항목 | 권장값 | 이유 |
|---|---|---|
| 포맷 | `.mp3` / `.m4a` / `.wav` | FFmpeg가 기본 지원 |
| 길이 | 30~60초 | 20초 숏폼보다 길면 OK. `amix duration=first`가 voice 길이 기준으로 자름 |
| BPM | 80~120 | 내레이션 속도와 잘 어울림 |
| 무드 | 차분·잔잔·인스트루멘탈 | 목소리를 묻지 않도록 보컬 없는 곡 권장 |
| 파일 수 | 10~20개 | 5개 영상 × 일일 여러 회 → 중복 체감 최소화 |

---

## 설치 가이드

1. 위 3개 사이트 중 한 곳 접속
2. "lo-fi", "ambient", "chill", "meditation", "cinematic" 같은 키워드로 검색
3. 다운로드 후 본 디렉토리(`assets/bgm/`)에 그대로 저장
4. 파일명 규칙(선택): `<mood>_<length>_<source>.mp3`
   - 예: `calm_45s_freepd.mp3`, `chill_60s_pixabay.m4a`
5. `npm run seed:assets`로 파일 수 확인(경고만, 실패 없음)

**쉽게 말하면**: 사이트에서 맘에 드는 무료 음악 10~20곡 받아서 이 폴더에 넣으면 끝. 파일 이름은 아무렇게나 괜찮습니다.

---

## 볼륨 균형

현재 설정: **voice 1.0 : bgm 0.3** (BGM이 내레이션의 약 30% 세기)

- 구현 위치: `lib/pipeline/video.ts` `buildAmixFilter()`
- 변경 방법: `BGM_VOLUME` 환경변수 (기본 0.3, 범위 0.0~1.0)
- Phase 2.5에서 `settingsStore.bgmVolume` 사용자 제어로 승격 예정

---

## 비활성화

특정 영상 생성 시 BGM을 끄고 싶다면:

```bash
DISABLE_BGM=1 npx tsx scripts/run-pipeline-once.ts
```

또는 `assets/bgm/` 디렉토리의 모든 파일을 삭제하면 자동으로 기존 2-input 경로로 폴백.

---

## 관련 파일

- `lib/providers/bgm.ts` — BGM 파일 랜덤 선택
- `lib/pipeline/video.ts` — FFmpeg amix 3-input 합성
- `scripts/test-bgm.ts` — BGM 믹스 수동 검증
- `scripts/seed-assets.ts` — BGM 파일 수 체크(경고만)
