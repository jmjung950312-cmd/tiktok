# P1-T19 TikTok 수동 업로드 체크리스트 (DoD 15)

> 작성일: 2026-04-09 | 담당: 이정모 | 상태: 체크리스트 대기(사용자 수동 단계)

## 0. 범위

DoD 15 는 **완전 자동화할 수 없는** Phase 1 최종 검증 단계다. 본 문서는 사용자가 별도 환경(TikTok 앱/웹)에서 1회 수행하기 위한 체크리스트와 결과 기록 템플릿을 제공한다.

## 1. 사전 조건

- [ ] P1-T18 완료(MeloTTS 실제 합성 기반 실 E2E), 또는 최소 1개 mp4 산출물 존재
- [ ] `data/jobs/<jobId>/output/` 에 9:16 1080×1920 mp4 1개 이상
- [ ] `data/jobs/<jobId>/metadata.json` 에 `ai_generated=true` + 해당 아이템의 `caption` / `hashtags`

P1-T18 의 모의 자동에서 생성된 sine-dummy mp4 는 **시각 테스트용**이며 TikTok 업로드에는 사용하지 않는다. 업로드는 반드시 MeloTTS 한국어 음성이 들어간 mp4 로 진행한다.

## 2. 업로드 절차

### 2.1 mp4 + 메타 선택

```bash
# 최근 잡 디렉토리 확인
ls -t data/jobs | head -1

# 메타데이터 확인
cat data/jobs/<jobId>/metadata.json | jq '.items[0]'
```

사용할 1개 아이템의 `filename`, `caption`, `hashtags` 를 기록.

### 2.2 TikTok 앱 업로드 단계

TikTok 모바일 앱 또는 웹(studio.tiktok.com) 기준.

- [ ] 업로드 화면 진입
- [ ] mp4 파일 선택 (macOS 에서 업로드 시 `scp` 또는 iCloud Drive 공유)
- [ ] **AI 생성 콘텐츠 공시 토글 ON** (필수 — PRD DoD 15 준수)
- [ ] 캡션 입력 (`metadata.json` 의 `caption` 복사)
- [ ] 해시태그 입력 (`hashtags` 3~5개 복사)
- [ ] "다음" → "게시"
- [ ] 게시 후 앱 내부에서 재생 확인:
  - [ ] 9:16 비율 유지
  - [ ] 한국어 자막 정상 노출
  - [ ] 한국어 TTS 음성 재생
  - [ ] 약 20초 길이

### 2.3 비용 확인

- [ ] Anthropic 대시보드 → 이번 달 청구 확인
- [ ] Max 플랜 정기 구독 외 **추가 과금 $0** 확인

## 3. 결과 기록 템플릿

### 3.1 업로드 정보

- 일시: `<YYYY-MM-DD HH:MM>`
- jobId: `<uuid>`
- 선택 아이템: `<filename>`
- TikTok URL: `<https://www.tiktok.com/@.../...>`
- 캡션 (붙여넣기 그대로):
  ```
  <caption>
  ```
- 해시태그: `<#연애심리 #...>`

### 3.2 재생 검증

| 항목 | 결과 |
|---|---|
| 9:16 비율 | ⬜ |
| 한국어 자막 노출 | ⬜ |
| 한국어 TTS 음성 | ⬜ |
| 길이 약 20초 | ⬜ |
| AI 공시 토글 ON | ⬜ |

### 3.3 비용

- Anthropic Max 플랜 월 구독: 기존 청구 그대로
- **추가 결제: $0** ⬜
- 기타 유료 API(Pexels/Pixabay/ElevenLabs 등) 미사용: ⬜

## 4. Phase 1 완료 선언

위 체크 전부 통과 시:

- [ ] `docs/ROADMAP.md` L408 `P1-T19` `[x]` 처리
- [ ] 이 문서의 결과 섹션(3) 내용 작성
- [ ] `docs/ROADMAP.md` Phase 1 상단 상태 업데이트
- [ ] Shrimp 에 "Phase 1 완료" 회고 태스크 등록(선택)

## 5. 알려진 이슈 참고

- **R-15** 시나리오 B(개발) 실행 시 plan mode × Opus 토큰 폭증. Phase 1 기간에 실측. 이 태스크는 시나리오 A 산출물 업로드라 직접 영향 없음.
- **R-19** prompt-tuner 승인 후 git 충돌은 Phase 3 이슈. 업로드와 무관.
- **cron 자동 등록** Phase 2 연기(§14). 본 태스크는 수동 업로드이므로 영향 없음.
