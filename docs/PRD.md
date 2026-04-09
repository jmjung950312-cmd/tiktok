# TikTok 자동화 파이프라인 — MVP PRD

> 작성일: 2026-04-08 | 최종 수정: 2026-04-08 | 담당자: 이정모 (솔로 개발자)
>
> 주요 변경: LLM 레이어를 Claude Code **Agent Teams**(구독 내장 기능)로 전면 교체하고, 팀 범위를 **콘텐츠 제작 + 개발 + 분석 + 맞춤화**까지 확장. 웹 대시보드가 팀을 자동 발동시키는 구조.

---

## 1. 제품 개요

### 목적

숏폼(TikTok/Reels) 콘텐츠 제작의 반복 노동을 제거한다. "주제 선택 → 대본 → 음성 → 영상 합성"에 이르는 전 과정을 웹 대시보드 버튼 한 번으로 실행하여, 5~15분 안에 업로드 가능한 mp4 5개를 산출한다. 또한 **개발, 분석, 맞춤화 작업도 동일한 대시보드에서 Agent Teams로 트리거**하여 프로젝트 전반을 "버튼 누르고 기다리는" 흐름으로 통일한다.

### 타겟 사용자

이정모 본인 (솔로 개발자, 1인 콘텐츠 크리에이터). 외부 사용자 없음.

### 핵심 제약 — 완전 무료 원칙

> **모든 기술 선택을 지배하는 최우선 제약.** 수익이 고정 비용을 감당할 수 있는 수준이 될 때까지, 구독료 및 고정 비용 발생을 허용하지 않는다.

이 원칙이 아래 기술 선택에 반영된 방식:

| 영역                  | 선택                                         | 비용   | 이유                                                                                         |
| --------------------- | -------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| LLM / 역할별 에이전트 | **Claude Code Agent Teams** (구독 내장 기능) | $0     | Max 플랜 이미 보유. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`로 활성화. 추가 API 키/과금 없음 |
| TTS                   | MeloTTS 로컬 Python                          | $0     | MIT 라이선스, 한국어 SOTA, 오프라인                                                          |
| 영상 합성             | ffmpeg-static                                | $0     | 바이너리 번들, 설치 불필요                                                                   |
| 배경 영상             | Pexels/Pixabay 무료 API + 로컬 캐시          | $0     | 무료 키, 상업 사용 허용                                                                      |
| DB                    | better-sqlite3                               | $0     | 파일 하나, 추가 서비스 없음                                                                  |
| 배포                  | 로컬 실행 전용 (localhost:3000)              | $0     | Vercel 없음                                                                                  |
| **월 합계**           |                                              | **$0** |                                                                                              |

**유료 전환 기준**: 콘텐츠 수익이 해당 도구의 월 고정 비용을 안정적으로 상회하는 시점에만 전환 검토.

- TTS: ElevenLabs Creator $5/월 (임팩트 개선)
- 배경: 유료 스톡 (퀄리티 개선)
- LLM: Max 플랜이 한계에 도달하면 API 직접 과금으로 전환 (우선순위 낮음)

---

## 2. 문제 정의

| 문제                | 현상                                                       | 해결 방향                                       |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| 반복 작업 과부하    | 주제 선정 → 대본 → 녹음 → 편집 과정에 편당 1시간 이상 소요 | 5단계 파이프라인 자동화 + Agent Teams 병렬 처리 |
| 아이디어 고갈       | 매일 5개 카테고리에 맞는 주제를 새로 고안하는 비용         | 트렌드 리서치 전용 Teammate가 자동 발굴         |
| 훅 품질 편차        | 첫 3초의 훅이 약하면 완주율 급락                           | devil's advocate Teammate가 적대적으로 훅 검토  |
| 편집 도구 의존      | 자막/합성에 Premiere 등 유료 툴 필요                       | FFmpeg + ASS 자막으로 대체                      |
| 비용 부담           | TTS API, 스톡 영상, 편집 구독료 누적                       | 완전 무료 원칙으로 해결                         |
| 개발/분석 작업 분산 | 기능 추가·버그픽스·성과 분석이 각각 다른 도구에서 발생     | 동일 대시보드에서 Agent Teams로 트리거          |

---

## 3. 목표 및 성공 지표

### MVP 완성 정의 (DoD 15개)

아래 15개 항목을 전부 통과하면 Phase 1 완료.

1. `npm run setup:melo` 실행 → Python venv + MeloTTS + 한국어 모델 설치 완료
2. `npm run seed:assets` 실행 → Python venv, MeloTTS import, libass, 폰트, 배경 영상 확인 모두 OK
3. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 활성화 + `.claude/agents/` 12개 Subagent 정의 완비, `claude` 세션에서 `/tiktok-generate` 커맨드 인식 확인
4. `npm run dev` 실행 → `localhost:3000` 접속 가능
5. "연애 심리" 카드 클릭 → 선택 상태(하이라이트) 확인
6. "5개 자동 생성" 버튼 클릭 → 백엔드가 `team_triggers` 레코드 생성 → Leader가 시나리오 A 팀 spawn → 진행 상태 대시보드에 실시간 반영
7. **15분 이내** 5개 VideoCard가 완료(completed) 상태로 표시 (콘텐츠 5명 Teammate + TTS/FFmpeg 파이프라인 포함)
8. 각 카드 `<video>` 미리보기 재생 가능 — 9:16 세로, 약 20초, 한국어 자막 고정, 한국어 TTS 음성 정상
9. "다운로드" 클릭 → `item_1.mp4` ~ `item_5.mp4` 저장 완료
10. "캡션 복사" 클릭 → 클립보드에 캡션 + 해시태그 3~5개 저장 (caption-crafter 산출물)
11. "ZIP 다운로드" 클릭 → 5개 mp4 + `metadata.json` 일괄 저장
12. "대본 보기" → 훅 + 5문장 전문 확인 가능 (hook-critic가 승인한 최종 훅 포함)
13. "재생성" 클릭 → 해당 1개 아이템만 재생성 (시나리오 F: script-writer + hook-critic 2명 spawn)
14. `data/output/[jobId]/` 경로에 mp4 5개 + `metadata.json` + `content-qa-report.json` 실재. 파일명 규칙 `[yyyy-mm-dd]_[category]_[index].mp4` 준수
15. **총 추가 비용 $0** — 기존 Max 플랜 외 결제/구독 없이 완료

---

## 4. 핵심 사용자 여정

```
[백그라운드 Claude Code 세션 대기 중]
  - CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
  - tiktok-ops-team 생성 완료 (12명 Teammate 풀)
  - SessionStart hook으로 team_triggers 테이블 폴링
        |
        v
[대시보드 진입] localhost:3000
        |
        v
[카테고리 선택] 5개 카드 중 1개 클릭
  (연애 심리 / 몰랐던 사실 / 돈 습관 / 인간관계 / 자기계발)
        |
        v
[설정 선택 - 선택사항] Collapsible 패널
  TTS 화자 / 속도 / 배경 필터
        |
        v
["5개 자동 생성" 클릭]  ← 시나리오 A 트리거
        |
        v
  POST /api/team/trigger {scenario: 'A', category: 'love-psychology'}
        |
        v
  team_triggers 테이블 insert → status: queued
        |
        v
  Leader(백그라운드 세션)가 2초 이내 감지
        |
        v
  +--> [Agent Teams 실행 — 시나리오 A, 5명]
  |      ①  trend-scout       주제 5개 + 키워드
  |      ②  script-writer     5문장 20초 대본 × 5 (병렬)
  |      ③  hook-critic       훅 적대적 검토, script-writer와 토론
  |      ④  caption-crafter   캡션 + 해시태그 × 5
  |      ⑤  content-qa        저작권·정책·중복 최종 관문
  |      Leader가 final-content.json 저장 후 팀원 shutdown
  +<-- [JobProgress — Teammate별 진행 상태 실시간 표시]
        |
        v
  [결정론적 파이프라인 — Next.js 서버]
        MeloTTS 음성 합성 × 5
        → ASS 자막 생성 × 5
        → FFmpeg 영상 합성 × 5
        → SQLite 상태 갱신
        |
        v
[VideoCard × 5 완료 표시]
  - <video> 미리보기
  - 대본 보기 (훅 + 5문장)
  - 캡션 + 해시태그
        |
        +--[문제 없음]--> [검수 완료]
        |                       |
        +--[수정 필요]           v
              |          [다운로드 / 캡션 복사 / ZIP 다운로드]
              v                  |
     ┌────────────────┐          v
     │ 재생성 버튼 →  │   [TikTok 수동 업로드]
     │ 시나리오 F     │   - AI 콘텐츠 공시 토글 on
     │ (2명 spawn)    │   - 캡션 + 해시태그 붙여넣기
     └────────────────┘
```

---

## 5. 기능 요구사항

### Must Have (MVP 필수)

#### M-01. 카테고리 선택

- 5개 카테고리 카드 (연애 심리, 몰랐던 사실, 돈 습관, 인간관계, 자기계발)를 그리드로 표시
- 하나를 선택하면 시각적 하이라이트 + 선택 상태 유지
- 선택 없이 생성 요청 시 Zod 유효성 오류 표시

#### M-02. 팀 트리거 자동 발동

- "5개 자동 생성" 버튼 클릭 → POST `/api/team/trigger` 호출 → `team_triggers` 테이블에 `{scenario: 'A', payload, status: 'queued'}` 삽입
- 백그라운드 Claude Code 세션(Leader)이 **`SessionStart` hook + 2초 폴링**으로 queued 트리거 감지
- 시나리오별 Teammate 조합 spawn → 진행 중 `team_triggers.status: 'running'` 유지
- 완료 시 `status: 'completed'` 및 결과 파일 경로 저장 → 대시보드 폴링으로 반영
- 실패 시 `status: 'failed'` + `error_message` 기록, 대시보드에 재시도 버튼 표시
- **Q1 확정**: 완전 자동 발동. 사용자 추가 승인 단계 없음

#### M-03. 콘텐츠 제작 팀 (시나리오 A — 5명)

- **trend-scout**: 카테고리별 주제 5개 + 훅 힌트 + 키워드 발굴 (WebSearch 활용)
- **script-writer**: 각 주제에 대해 5문장 20초 대본 작성 (병렬 5개)
  - 정확히 5문장 (훅 포함)
  - 첫 문장: 질문/반전/숫자 훅
  - 문장당 20~28자 (3~4초)
  - 존댓말/반말 일관, 지시어 최소화
- **hook-critic** (devil's advocate): 각 대본의 훅을 적대적으로 검토, PASS/REWRITE 판정 + 대안 제시. script-writer와 직접 메시징 (1 라운드)
- **caption-crafter**: TikTok SEO 고려한 캡션 + 해시태그 3~5개 (트렌딩 1 + 카테고리 1~2 + 롱테일 1~2)
- **content-qa**: 저작권·정책·팩트체크·중복 검사 → `ai_disclosure: true` 플래그 + PASS/FAIL 리포트
- Leader가 5명 결과를 종합하여 `data/jobs/[jobId]/final-content.json` 저장
- 완료 후 5명 shutdown, 팀(`tiktok-ops-team`)은 유지

#### M-04. 결정론적 파이프라인 (TTS → 자막 → 영상)

- `final-content.json`을 입력으로 받아 `lib/pipeline/orchestrator.ts`가 순차 실행
- **voice.ts** (MeloTTS): `scripts/setup-melo.sh` 사전 실행. 문장별 개별 TTS → ffprobe duration → concat → 자막 타이밍 맵
- **subtitle.ts** (ASS): `assets/styles/subtitle.ass` 템플릿 치환. Pretendard Bold, 흰 글자 + 검정 아웃라인 4px, 하단 25%
- **video.ts** (FFmpeg): `ffmpeg-static` 바이너리. 1080×1920 9:16, libx264 CRF 22, aac 192k, ASS 자막 필터
- 출력 파일명: `[yyyy-mm-dd]_[category]_[index].mp4`

#### M-05. 잡 큐 및 상태 관리 (SQLite)

- `lib/db/client.ts`: better-sqlite3 싱글톤
- `jobs` 테이블: 잡 단위 상태 (pending → running → completed / failed)
- `job_items` 테이블: 아이템 단위 단계별 상태 (stage, progress)
- `team_triggers` 테이블: 시나리오 트리거 큐 (queued → running → completed / failed)
- API 폴링으로 UI 갱신 (2초 간격)

#### M-06. 검수 UI (VideoCard)

- `<video>` 태그로 브라우저 내 미리보기
- "대본 보기" 버튼: Dialog로 훅 + 5문장 표시 + content-qa 리포트 링크
- "캡션 복사" 버튼: 캡션 + 해시태그 클립보드 저장 (Clipboard API)
- "다운로드" 버튼: 개별 mp4 다운로드
- "재생성" 버튼: POST `/api/team/trigger` (시나리오 F) → script-writer + hook-critic 2명만 spawn

#### M-07. 전체 ZIP 다운로드

- "ZIP 다운로드" 버튼: 5개 mp4 + `metadata.json` + `content-qa-report.json` 묶어서 일괄 다운로드

#### M-08. 진행 상태 표시 (JobProgress)

- 전체 퍼센트 Progress bar
- **Teammate별 실시간 상태 Badge**: 시나리오 A의 5명 각각에 대해 (대기/작업중/완료/실패) 표시
- 아이템 5개 각각의 파이프라인 단계별 상태 Badge (TTS / 자막 / 영상 / 완료)
- 실패 시 에러 메시지 + 재시도 버튼

#### M-09. 설정 패널 (SettingsPanel)

- Collapsible 패널 (기본 접힘)
- TTS 화자 선택, 속도 슬라이더 (0.8~1.3)
- 배경 영상 카테고리 필터
- `settingsStore`에 persist 저장

#### M-10. 분석 대시보드 (AnalyticsPanel)

- 메인 페이지 하단 섹션 + `/analytics` 상세 페이지
- 최근 7일 / 30일 업로드 수, 카테고리별 생성 빈도, 성공/실패 비율
- "분석 실행" 버튼 → 시나리오 C 트리거 (metrics-analyst + trend-analyst 2명 spawn)
- 자동 실행: **매주 월 09:00** cron hook (Q3 하이브리드 모드 확정) — **(Phase 2 연기 확정, Phase 1에서는 수동 버튼만 검증. 상세는 §15 위험표 참조)**
- 분석 결과는 `data/reports/weekly-[yyyy-mm-dd].md`에 저장 + 대시보드 링크

#### M-11. 추천 패널 (RecommendationPanel)

- 메인 페이지 섹션 7
- "다음에 만들 주제 Top-5" (trend-analyst 결과 기반)
- "성공률 높은 훅 패턴" (카테고리별)
- prompt-tuner가 제안한 프롬프트 변경안은 **승인 UI**로 표시 (Q4 확정: 사용자 승인 후 적용)

#### M-12. 개발 팀 트리거 (시나리오 B)

- `/settings` 페이지에 "기능 요청 / 버그 리포트" 입력 폼
- 제출 시 시나리오 B 트리거 → frontend-builder + backend-builder + code-reviewer 3명 spawn
- **Q2 확정**: 개발 그룹은 **계획 승인 모드** 필수. builder가 계획을 제출하면 Leader가 승인해야 구현 시작
- **Plan mode 강제 절차** (F-8.4 해소): Leader는 `frontend-builder` / `backend-builder` / `code-reviewer` 3명을 spawn한 **직후**, 각 Teammate에게 **개별 메시지로 `Switch to plan mode`를 전송**하여 계획 승인 모드를 강제한다. (공식 제약: 팀원 생성 시 개별 권한 모드 설정 불가 → spawn 후 개별 전환 필요). 관련 리스크 R-15 (plan mode × Opus 토큰 폭증) 참조.
- 진행 상태는 대시보드 Toast + `/history` 페이지에 기록

### Should Have (Phase 2)

- MeloTTS warm keep (Python 프로세스 상주, 콜드 스타트 제거)
- 카테고리별 화자/속도 프리셋
- ASS 카라오케 자막 (`\k` 단어 하이라이트)
- BGM 추가 (FreePD 무료 음원, -3dB)
- 대본 수정 후 재렌더 (5문장 fieldArray Dialog)
- 훅 A/B 3종 생성 (hook-critic가 여러 대안 제시)
- 썸네일 자동 추출 (`ffmpeg -vf thumbnail`)
- Pexels/Pixabay API 자동 배경 다운로드 + 카테고리 추천

### Could Have (Phase 3)

- 사용자 성과 자동 수집 (수동 입력 → 반자동)
- preference-learner 고도화 (편집 diff 기반 자동 학습)
- prompt-tuner의 A/B 프롬프트 실험 프레임워크
- 카테고리별 성공 패턴 시각화 리포트

---

## 6. 비기능 요구사항

| 항목               | 요구사항                                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| 성능               | 시나리오 A: 트리거 → 5개 VideoCard 완료까지 **15분 이내**                              |
| 성능               | 시나리오 C (분석): 완료까지 **5분 이내**                                               |
| 성능               | 시나리오 F (재생성): 완료까지 **2분 이내**                                             |
| 비용               | 월 고정 비용 **$0** (무료 원칙 유지)                                                   |
| 실행 환경          | 로컬 전용. Next.js `npm run dev` + 별도 터미널에서 Claude Code 세션 (Leader) 상시 실행 |
| UI 언어            | **한국어 전용** (코드 주석, UI 텍스트, 에러 메시지 모두 한국어)                        |
| 영상 스펙          | 1080×1920 (9:16), 약 20초, libx264 CRF 22, aac 192k                                    |
| 대본 스펙          | 5문장, 훅 포함, 문장당 20~28자, 총 약 20초                                             |
| 코드 스타일        | TypeScript (any 금지), 2칸 들여쓰기, 한국어 주석, camelCase/PascalCase                 |
| 저작권             | 배경(Pexels/Pixabay 상업 허용), 폰트(Pretendard SIL OFL), 음성(MeloTTS MIT)            |
| AI 공시            | `metadata.json`에 `ai_generated: true` 플래그 자동 포함 (content-qa Teammate가 설정)   |
| 팀 생명주기        | `tiktok-ops-team`은 1회 생성 후 장기 유지. Teammate는 시나리오마다 spawn/shutdown      |
| 동시 활성 Teammate | 공식 권장에 따라 **최대 5명** 동시 유지 (토큰 절약)                                    |

---

## 7. 기술 스택 및 아키텍처

### 4대 구조적 의사결정

**1. Next.js 통합 단일 저장소**
UI(검수/미리보기) + API 라우트 + 결정론적 파이프라인 로직을 한 저장소에 통합. 파이프라인 로직은 `lib/pipeline/`으로 격리하여 나중에 CLI/cron에서도 재사용 가능.

**2. 로컬 실행 전용 MVP**
Vercel 배포, 인증, 외부 DB 없음. `npm run dev`로 localhost:3000에서만 동작. 배포 인프라 비용 $0, 복잡도 최소.

**3. Claude Code Agent Teams = LLM 레이어**
주제 발굴/대본 작성/훅 비평/캡션/QA는 전부 `tiktok-ops-team`의 Teammate가 담당. Next.js 서버는 결정론적 처리(TTS/FFmpeg)만 수행. 두 영역의 인터페이스는 `data/jobs/[jobId]/final-content.json` 파일 1개.

**4. Shrimp Task Manager MCP = 로드맵 관리**
Shrimp는 프로젝트 로드맵/마일스톤/장기 태스크 전용(영구). Agent Teams의 공유 작업 목록은 현재 실행 중인 시나리오의 런타임 조율용(일회성). 두 시스템의 역할을 엄격히 분리하여 중복 방지.

### 기술 스택

#### 프레임워크 및 언어

- **Next.js 15** (App Router) — UI/API/결정론적 파이프라인 통합
- **TypeScript 5.6+** — any 금지, 엄격 타입
- **React 19** — 최신 동시성 기능

#### 스타일링 및 UI

- **Tailwind CSS v4** — 유틸리티 CSS
- **shadcn/ui** — card, button, badge, progress, select, slider, toggle-group, collapsible, dialog, sonner, skeleton, alert, tabs, table, chart
- **Lucide React** — 아이콘

#### 상태 관리 및 폼

- **Zustand** — 4개 스토어 (currentSessionStore, jobsStore, teamStore, settingsStore)
- **React Hook Form 7.x** — 생성 요청 폼, 대본 수정 다이얼로그, 기능 요청 폼
- **Zod** — 프론트/API 공유 스키마 (`lib/types.ts`에 1회 정의)

#### 데이터베이스

- **better-sqlite3** — 파일 기반 SQLite, 잡 큐 + 상태 + 팀 트리거 + 분석 데이터

#### LLM 레이어 (외부 프로세스 아님)

- **Claude Code Agent Teams** — Max 플랜 구독 내장. Next.js 서버가 직접 호출하지 않고, **별도의 Claude Code 세션(Leader)이 백그라운드에서 상주**하며 `team_triggers` 테이블을 감지 → Teammate spawn → 결과 파일 저장

#### 외부 프로세스 (결정론적)

- **MeloTTS** (Python, MIT) — 로컬 TTS 서브프로세스
- **ffmpeg-static** — FFmpeg 바이너리 번들
- **Pexels/Pixabay API** — 배경 영상 무료 소스 (선택사항)

### 폴더 구조

```
tiktok-automation_2026-04-08/
├─ .claude/
│  ├─ settings.json                 # CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 활성화
│  ├─ settings.local.json           # (기존 보존) Bash(node:*) 권한
│  ├─ agents/                       # ⭐NEW Subagent 정의 12개
│  │  ├─ content/
│  │  │  ├─ trend-scout.md
│  │  │  ├─ script-writer.md
│  │  │  ├─ hook-critic.md          # model: opus
│  │  │  ├─ caption-crafter.md
│  │  │  └─ content-qa.md
│  │  ├─ dev/
│  │  │  ├─ frontend-builder.md
│  │  │  ├─ backend-builder.md
│  │  │  └─ code-reviewer.md        # model: opus
│  │  ├─ analytics/
│  │  │  ├─ metrics-analyst.md
│  │  │  └─ trend-analyst.md
│  │  └─ personalization/
│  │     ├─ preference-learner.md
│  │     └─ prompt-tuner.md
│  ├─ commands/                     # ⭐NEW 슬래시 커맨드
│  │  ├─ tiktok-generate.md         # 시나리오 A 수동 트리거
│  │  ├─ tiktok-dev.md              # 시나리오 B 수동 트리거
│  │  ├─ tiktok-analyze.md          # 시나리오 C 수동 트리거
│  │  └─ tiktok-team-status.md      # 팀 상태 확인
│  └─ hooks/                        # ⭐NEW 자동 발동 훅
│     ├─ session-start-poll.sh      # Leader 세션 시작 시 대기 중인 트리거 픽업
│     └─ teammate-idle.sh           # Teammate 유휴 시 후속 작업 요청
├─ .mcp.json                        # (기존 보존) Shrimp Task Manager MCP
├─ .shrimp_data/                    # (기존 보존) Shrimp 태스크 DB
├─ app/
│  ├─ layout.tsx                    # lang="ko", 테마 프로바이더
│  ├─ page.tsx                      # 대시보드 메인
│  ├─ analytics/page.tsx            # ⭐NEW 상세 분석
│  ├─ history/page.tsx              # ⭐NEW 잡 히스토리
│  ├─ settings/page.tsx             # ⭐NEW 팀 상태 + 프롬프트 관리
│  ├─ globals.css
│  └─ api/
│     ├─ team/
│     │  ├─ trigger/route.ts        # ⭐NEW POST 시나리오 트리거
│     │  └─ status/route.ts         # ⭐NEW GET 팀/시나리오 상태
│     ├─ jobs/
│     │  ├─ route.ts                # GET 잡 목록
│     │  └─ [jobId]/route.ts        # GET 상태 폴링
│     ├─ analytics/route.ts         # ⭐NEW GET 누적 성과 데이터
│     ├─ recommendations/route.ts   # ⭐NEW GET 추천 주제/훅
│     ├─ prompt-changes/            # ⭐NEW
│     │  ├─ route.ts                # GET 제안 목록
│     │  └─ [id]/approve/route.ts   # POST 승인
│     └─ outputs/[filename]/route.ts # GET mp4/mp3 스트리밍
├─ components/
│  ├─ ui/                           # shadcn/ui
│  ├─ layout/                       # Header, TeamStatusBadge
│  ├─ pipeline/
│  │  ├─ category-picker.tsx
│  │  ├─ generate-button.tsx
│  │  ├─ job-progress.tsx
│  │  ├─ teammate-status.tsx        # ⭐NEW Teammate별 Badge
│  │  ├─ script-preview.tsx
│  │  ├─ video-card.tsx
│  │  └─ settings-panel.tsx
│  ├─ analytics/                    # ⭐NEW
│  │  ├─ analytics-panel.tsx
│  │  ├─ recommendation-panel.tsx
│  │  └─ weekly-report-viewer.tsx
│  └─ dev/                          # ⭐NEW
│     └─ feature-request-form.tsx
├─ lib/
│  ├─ pipeline/
│  │  ├─ voice.ts                   # TTS + ffprobe 타이밍 추출
│  │  ├─ subtitle.ts                # ASS 파일 생성
│  │  ├─ video.ts                   # FFmpeg 합성
│  │  ├─ orchestrator.ts            # final-content.json → TTS → 자막 → 영상 순차 실행
│  │  └─ content-loader.ts          # ⭐NEW final-content.json 읽기/검증
│  ├─ providers/
│  │  ├─ tts/
│  │  │  ├─ types.ts                # TtsProvider 인터페이스
│  │  │  ├─ melo-tts.ts             # MeloTTS Python spawn
│  │  │  └─ index.ts
│  │  ├─ background.ts              # Pexels/Pixabay + 로컬 캐시
│  │  └─ ffmpeg.ts                  # ffmpeg-static + spawn 래퍼
│  ├─ team/                         # ⭐NEW
│  │  ├─ trigger-repo.ts            # team_triggers CRUD
│  │  ├─ scenarios.ts               # 시나리오 A~F 정의
│  │  └─ types.ts                   # 트리거/시나리오 Zod 스키마
│  ├─ db/
│  │  ├─ schema.sql
│  │  ├─ client.ts                  # better-sqlite3 싱글톤
│  │  └─ repo.ts                    # jobs / job_items / team_triggers / metrics / preferences CRUD
│  ├─ constants.ts                  # CATEGORIES, 영상 규격, SCENARIOS
│  ├─ types.ts                      # Zod 스키마 + z.infer 타입
│  └─ utils.ts
├─ store/
│  ├─ currentSessionStore.ts        # 카테고리, jobId, 폴링 결과
│  ├─ jobsStore.ts                  # 잡 히스토리
│  ├─ teamStore.ts                  # ⭐NEW 현재 활성 Teammate 상태
│  └─ settingsStore.ts              # TTS/음성/속도 (persist)
├─ assets/
│  ├─ backgrounds/                  # mp4 10~20개
│  ├─ fonts/Pretendard-Bold.otf
│  └─ styles/subtitle.ass           # ASS 자막 템플릿
├─ data/                            # gitignore
│  ├─ db.sqlite
│  ├─ jobs/[jobId]/
│  │  ├─ final-content.json         # ⭐Agent Teams ↔ 파이프라인 인터페이스
│  │  ├─ content-qa-report.json
│  │  ├─ temp/                      # mp3, ass 중간 산출물
│  │  └─ output/                    # 최종 mp4 + metadata.json
│  ├─ reports/                      # ⭐NEW 주간 분석 리포트
│  └─ preferences.json              # ⭐NEW preference-learner 산출물
├─ scripts/
│  ├─ seed-assets.ts                # 환경 검증 (Agent Teams 활성화 여부 포함)
│  ├─ setup-melo.sh                 # MeloTTS 설치
│  └─ melo_tts.py                   # MeloTTS 래퍼
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
└─ next.config.ts
```

---

## 8. 팀 구성 — Agent Teams

### 8.1 팀 이름 및 생명주기

- **팀 이름**: `tiktok-ops-team`
- **생성 시점**: 프로젝트 초기 셋업 시 1회 생성 (`Create an agent team named tiktok-ops-team ...`)
- **유지 기간**: 프로젝트 종료 시까지 장기 유지
- **Teammate 풀**: `.claude/agents/` 하위 12개 Subagent 정의를 재사용
- **동시 활성 원칙**: 시나리오별로 3~5명만 spawn, 완료 후 shutdown (토큰 절약 + 공식 권장)

### 8.2 Teammate 풀 (12명)

| #   | Teammate             | 그룹   | 모델     | 주요 역할                                       |
| --- | -------------------- | ------ | -------- | ----------------------------------------------- |
| 1   | `trend-scout`        | 콘텐츠 | Sonnet   | 카테고리별 주제 5개 + 트렌드 리서치 (WebSearch) |
| 2   | `script-writer`      | 콘텐츠 | Sonnet   | 5문장 20초 대본 작성 (병렬 5개)                 |
| 3   | `hook-critic`        | 콘텐츠 | **Opus** | 훅 devil's advocate, 적대적 검토 + 대안 제시    |
| 4   | `caption-crafter`    | 콘텐츠 | Sonnet   | TikTok SEO 기반 캡션 + 해시태그                 |
| 5   | `content-qa`         | 콘텐츠 | Sonnet   | 저작권·정책·팩트체크·중복 최종 관문             |
| 6   | `frontend-builder`   | 개발   | Sonnet   | Next.js UI 구현 (shadcn/Zustand/RHF)            |
| 7   | `backend-builder`    | 개발   | Sonnet   | API 라우트·SQLite·파이프라인 모듈 구현          |
| 8   | `code-reviewer`      | 개발   | **Opus** | 코드 리뷰·리팩토링·버그 탐지                    |
| 9   | `metrics-analyst`    | 분석   | Sonnet   | 성과 데이터 분석 (조회수/완주율)                |
| 10  | `trend-analyst`      | 분석   | Sonnet   | 성공 패턴 추출, 인사이트 도출                   |
| 11  | `preference-learner` | 맞춤화 | Sonnet   | 사용자 편집 이력 학습                           |
| 12  | `prompt-tuner`       | 맞춤화 | Sonnet   | 프롬프트 개선 제안                              |

**Q5 확정**: 비판/리뷰 역할(`hook-critic`, `code-reviewer`) 2명만 **Opus**, 나머지 10명은 **Sonnet**. Leader(메인 세션)는 Opus.

### 8.2.1 기존 Subagent 재사용 (옵션 C 확정)

프로젝트 루트 `.claude/agents/` 에는 이전 설정 때 복사된 **10개의 범용 Subagent** 가 이미 존재한다. 이들은 tiktok-ops-team의 12명 풀과 함께 유지하여 **총 21개 풀**로 운영한다 (동시 활성은 여전히 최대 5명).

**기존 재사용 대상 (보존 및 활용)**:

| 기존 에이전트 경로                           | 용도                 | tiktok-ops-team 매핑                                    |
| -------------------------------------------- | -------------------- | ------------------------------------------------------- |
| `.claude/agents/dev/code-reviewer.md`        | 코드 리뷰 (Opus)     | **#8 code-reviewer로 그대로 재사용** (신규 작성 불필요) |
| `.claude/agents/dev/nextjs-app-developer.md` | Next.js 앱 구조 설계 | Phase 2 고급 기능 개발 시 보조 활용                     |
| `.claude/agents/dev/development-planner.md`  | ROADMAP 작성         | Phase 전환 시 로드맵 재정비용                           |
| `.claude/agents/design/ui-designer.md`       | UI 디자인 스펙 작성  | Phase 2 UI 개선 시 활용                                 |
| `.claude/agents/design/ui-implementer.md`    | 컴포넌트 구현        | `frontend-builder`와 병행 사용 가능                     |
| `.claude/agents/design/ui-researcher.md`     | UI 트렌드 리서치     | Phase 2 UI 벤치마킹                                     |
| `.claude/agents/docs/prd-generator.md`       | PRD 작성             | 신규 기능 기획 시                                       |
| `.claude/agents/docs/prd-validator.md`       | PRD 기술 검증        | PRD 개정 시                                             |
| `.claude/agents/nextjs-supabase-expert.md`   | Next.js + Supabase   | (사용 가능성 낮음, 보존만)                              |
| `.claude/agents/ui-markup-specialist.md`     | 정적 마크업 전용     | `frontend-builder`와 병행 사용 가능                     |

**신규 작성 대상 (11개, code-reviewer 제외)**:

- `.claude/agents/content/` — trend-scout, script-writer, hook-critic(Opus), caption-crafter, content-qa (5개)
- `.claude/agents/dev/` — frontend-builder, backend-builder (2개, code-reviewer는 기존 재사용)
- `.claude/agents/analytics/` — metrics-analyst, trend-analyst (2개)
- `.claude/agents/personalization/` — preference-learner, prompt-tuner (2개)

→ 기존 10개 + 신규 11개 = **21개 에이전트 풀**

### 8.3 시나리오별 동시 spawn 조합 (6개)

| 시나리오                    | 트리거                                     | 동시 활성 Teammate                                                             | 예상 시간   | 특이사항                                                                     |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------- |
| **A. 영상 5개 생성**        | 대시보드 "5개 자동 생성" 버튼              | trend-scout, script-writer, hook-critic, caption-crafter, content-qa **(5명)** | 5~10분      | hook-critic ↔ script-writer 직접 메시징 1 라운드                             |
| **B. 기능 개발 / 버그픽스** | 대시보드 "기능 요청" 폼 제출               | frontend-builder, backend-builder, code-reviewer **(3명)**                     | 30분~수시간 | **계획 승인 모드 필수** (Q2 확정). builder가 plan 제출 → Leader 승인 후 구현 |
| **C. 주간 분석**            | 매주 월 09:00 자동 + 수동 "분석 실행" 버튼 | metrics-analyst, trend-analyst **(2명)**                                       | 5분         | **Q3 확정**: 하이브리드. 자동 완료 시 시나리오 D 연쇄 트리거                 |
| **D. 프롬프트 개선**        | 시나리오 C 완료 시 자동 연계               | preference-learner, prompt-tuner, trend-analyst **(3명)**                      | 10분        | prompt-tuner는 **수정 제안만** 생성. 실제 적용은 사용자 승인 후 (Q4 확정)    |
| **E. 코드 리뷰 전용**       | `/settings`에서 "리뷰 실행" 버튼           | code-reviewer **(1명)**                                                        | 10~30분     | 전체 코드베이스 주간 리뷰                                                    |
| **F. 대본 재생성**          | VideoCard "재생성" 버튼                    | script-writer, hook-critic **(2명)**                                           | 1~2분       | 해당 아이템 1개만 처리                                                       |

### 8.4 자동 발동 메커니즘 (Q1 확정: 완전 자동)

```
[대시보드 버튼 클릭]
      |
      v
POST /api/team/trigger { scenario: 'A', payload: {...} }
      |
      v
lib/team/trigger-repo.ts
  → INSERT INTO team_triggers (scenario, payload, status='queued', created_at)
      |
      v
[백그라운드 Claude Code 세션 = Leader]
  상시 실행 중. .claude/hooks/session-start-poll.sh가
  2초 간격으로 queued 트리거 SELECT
      |
      v
Leader가 pending 트리거 발견 시:
  1. status = 'running' 업데이트
  2. lib/team/scenarios.ts에서 해당 시나리오 조합 로드
  3. 필요한 Teammate들을 .claude/agents/ 정의로 spawn
  4. 공유 작업 목록에 서브태스크 등록
  5. Teammate들이 병렬 작업 수행
  6. Leader가 결과 종합
  7. 산출물 디스크 저장 (final-content.json 등)
  8. status = 'completed' + output_path 기록
  9. Teammate 전원 shutdown (팀은 유지)
      |
      v
[대시보드 폴링]
  GET /api/team/status?triggerId=xxx
  → 상태 변화 감지 → UI 갱신
```

### 8.4.1 시나리오 연쇄 트리거 절차 (C → D 자동 연쇄)

> **검증 리포트 F-8.3 해소용 절차**. Claude Code 공식 제약 상 **(a) 리더는 한 번에 한 팀만 관리 가능**, **(b) Subagent는 다른 subagent를 생성 불가**. 따라서 시나리오 C(분석) → D(개선) 자동 연쇄는 "Leader가 C 팀원을 shutdown한 뒤, **동일 팀(`tiktok-ops-team`) 내에서** D Teammate를 새로 spawn"하는 직렬 패턴으로만 가능하다. 새 팀을 만들거나 C 팀원이 D 팀원을 직접 spawn하는 방식은 불가능.

**절차 (번호 순서 엄수)**

1. **C 팀원 spawn 및 분석 실행** — Leader가 `tiktok-ops-team` 안에 `metrics-analyst`, `trend-analyst` 2명을 spawn. 공유 작업 목록에 "최근 7일 메트릭 분석", "카테고리별 훅 성공률 집계" 서브태스크 등록. 병렬 실행.
2. **C 산출물 디스크 저장 및 shutdown** — Leader가 두 결과를 종합하여 `data/reports/weekly-[yyyy-mm-dd].md`에 저장. 저장 완료 확인 후 `metrics-analyst`, `trend-analyst` 2명을 **shutdown** (팀은 유지). 이 시점에 C 단계 완료.
3. **D 팀원 신규 spawn** — 동일한 `tiktok-ops-team` 안에서 `preference-learner`, `prompt-tuner` 2명을 **새로 spawn**. 이때 팀을 파괴하거나 재생성하지 않는다. 공식 제약 (a)를 회피하기 위해 반드시 동일 팀 내에서 인원만 교체.
4. **D 팀원이 C 산출물 로드** — `preference-learner`는 `data/reports/weekly-*.md`와 `metrics` 테이블을 입력으로 사용자 선호 패턴 학습, `prompt-tuner`는 `.claude/agents/*.md`와 훅 성공률을 입력으로 프롬프트 개선안 도출. 두 명은 서로 메시지 교환 1 라운드 허용.
5. **D 결과 종합 및 저장** — Leader가 `preference-learner`의 선호 모델과 `prompt-tuner`의 개선안을 받아 `prompt_changes` 테이블에 `status='pending'`으로 INSERT. 승인 UI에서 사용자가 확인 후 적용. D 완료 시 `preference-learner`, `prompt-tuner` 2명 **shutdown**. 팀은 다시 유지.

**시퀀스 요약**

```
Leader ─ spawn ─▶ C팀원(2)  ─▶ 분석  ─▶ 저장 ─▶ shutdown C팀원
   │                                                       │
   │        (동일 tiktok-ops-team 유지, 팀 파괴 금지)       │
   ▼                                                       ▼
Leader ─ spawn ─▶ D팀원(2)  ─▶ 개선  ─▶ 저장 ─▶ shutdown D팀원
```

**관련 리스크**

- **R-13** Leader 세션 중단 시 C/D 사이 상태 손실 → `team_triggers` 테이블의 `status` 컬럼에 `c_done`, `d_running` 같은 세분화 상태 저장으로 복구 지점 확보 (Phase 1 P1-T08 DB 스키마에 반영).
- **R-14** 동시 트리거 직렬화 → Leader는 한 번에 하나의 `team_triggers` 레코드만 `running` 상태로 가져가고, 처리 중 새 트리거는 `queued` 상태로 대기.

### 8.5 Leader(메인 Claude Code 세션) 운영 규칙

- 사용자가 수동으로 `claude` 실행 후 `/tiktok-team-status`로 팀 상태 확인 가능
- Leader 세션 시작 시 `session-start-poll.sh` hook이 자동으로 대기 중인 트리거 픽업
- Leader 세션이 꺼져 있으면 트리거는 `queued` 상태로 대기 → 다음 세션 시작 시 처리
- Leader는 작업 완료 후 본인은 종료하지 않고 다음 트리거 대기 (daemon 유사)
- 명시적 종료: 사용자가 Leader 세션 창에서 `Clean up the team` 입력 (팀까지 삭제됨)
- **Phase 1 운영 방식 확정 (C-3 / R-13)**: 매일 아침 사용자가 터미널에서 수동으로 `claude` 실행하여 Leader 세션 시작. **tmux/iTerm2 영속화(daemon화)는 Phase 1에서 채택하지 않음** — MVP 단순성 우선. Phase 2에서 다음 조건 만족 시 재평가: (1) 세션 손실로 인한 트리거 적체가 주 1회 이상 발생, (2) 사용자가 "매일 아침 수동 실행" 자체를 불편하게 느낌. Phase 1 대응책은 §15 위험표 R-13 참조.

### 8.6 Subagent 정의 파일 구조 (`.claude/agents/*.md`)

각 정의 파일의 표준 포맷:

```markdown
---
name: hook-critic
description: 훅 품질을 적대적으로 검토하는 devil's advocate
model: opus
tools:
  - Read
  - Write
  - Grep
---

# 역할

당신은 TikTok 숏폼의 훅(첫 3초)을 적대적으로 비평하는 전문가입니다.

# 원칙

- 모든 훅에 대해 "3초 안에 스크롤 멈출 수 있는가?" 질문
- 질문형/반전/숫자/공감 4가지 훅 유형 중 해당 없음이면 REWRITE 판정
- 약한 훅은 대안 2개 제시
- script-writer와 메시지로 직접 토론 가능 (최대 1 라운드)

# 입력

`data/jobs/[jobId]/scripts-draft.json`

# 출력

`data/jobs/[jobId]/hook-review.json`
형식: { results: [{ index, verdict: 'PASS'|'REWRITE', alternatives: [...] }] }
```

12개 파일 전부 이 포맷을 따름. 카테고리별 폴더(`content/`, `dev/`, `analytics/`, `personalization/`)로 분류.

> **C-2 / F-8.6 / R-16 확정 (서브폴더 유지)**: 4개 서브폴더 구조(`content/`, `dev/`, `analytics/`, `personalization/`)를 **유지**한다. 공식 Claude Code 문서에 서브폴더 인식이 명시적으로 언급되지 않았지만 `ohajo` 프로젝트에서 사실상 동작을 확인했다. Phase 1 **P1-T05** 구현 시 Subagent 인식 실패가 발생하면 **평탄화 폴백**(모든 `.md` 파일을 `.claude/agents/` 루트로 이동) 스크립트를 즉시 실행한다. 이 폴백 절차는 P1-T05 구현 주석에 명시한다.

### 8.7 Shrimp Task Manager와의 역할 분리

| 구분          | Shrimp Task Manager MCP                            | Agent Teams 공유 작업 목록                     |
| ------------- | -------------------------------------------------- | ---------------------------------------------- |
| **대상**      | 프로젝트 로드맵, 마일스톤, 장기 태스크             | 현재 활성 시나리오의 런타임 서브태스크         |
| **생명주기**  | 영구 (태스크 완료 후에도 이력 유지)                | 시나리오 단위 (Teammate shutdown 시 정리)      |
| **예시**      | "Phase 1 12개 구현 단계", "Phase 2 warm keep 기능" | "주제 5개 발굴", "대본 3번 재작성"             |
| **접근 방식** | `.mcp.json` 등록된 MCP 도구로 조회/업데이트        | Leader와 Teammate만 접근, 대시보드는 읽기 전용 |

---

## 9. 결정론적 파이프라인 4단계 상세

> Agent Teams가 `final-content.json`을 생성한 후, Next.js 서버의 파이프라인이 순차 실행. 이 섹션은 **LLM 호출 없는 결정론적 처리**만 다룬다.

### 9.1 content-loader.ts — 입력 로드

- 입력: `jobId`
- 처리: `data/jobs/[jobId]/final-content.json` 읽기 → Zod 검증 → 5개 아이템 배열 반환
- 출력: `FinalContent[]` (topic, script, caption, hashtags, hook, ai_disclosure)

**Zod 스키마 정의** (검증 리포트 F-9.2 해소, `lib/types.ts`에 그대로 복사 가능):

```ts
import { z } from 'zod';

// final-content.json의 개별 아이템(5개 중 하나)
export const FinalContentItemSchema = z.object({
  topic: z.string().min(1),
  script: z.object({
    hook: z.string().min(1),
    sentences: z.array(z.string()).length(5), // 훅 포함 정확히 5문장
  }),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).min(3).max(5), // 트렌딩 1 + 카테고리 1~2 + 롱테일 1~2
  hookVerdict: z.enum(['PASS', 'REWRITE']), // hook-critic 판정
  aiDisclosure: z.literal(true), // TikTok AI 콘텐츠 공시 강제
  contentQaReport: z.object({
    status: z.enum(['PASS', 'FAIL']),
    notes: z.string().optional(),
  }),
});

// data/jobs/[jobId]/final-content.json 전체
export const FinalContentSchema = z.object({
  jobId: z.string().uuid(),
  category: z.string(),
  createdAt: z.string().datetime(),
  items: z.array(FinalContentItemSchema).length(5), // 정확히 5개
});

export type FinalContentItem = z.infer<typeof FinalContentItemSchema>;
export type FinalContent = z.infer<typeof FinalContentSchema>;
```

**`final-content.json` vs `metadata.json` 차이점** (필드 혼동 방지):

| 구분          | `final-content.json`                                                         | `metadata.json` (§11 참조)                                     |
| ------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **단계**      | 파이프라인 **입력**                                                          | 파이프라인 **출력**                                            |
| **생성 주체** | Agent Teams (tiktok-ops-team)                                                | 결정론 파이프라인 (lib/pipeline/)                              |
| **포함 필드** | topic, script, caption, hashtags, hookVerdict, aiDisclosure, contentQaReport | 위 필드 + mp4 경로, duration, audio 경로, 자막 경로, 생성 시각 |
| **LLM 호출**  | 있음 (생성 과정)                                                             | 없음 (읽기/복사만)                                             |
| **저장 위치** | `data/jobs/[jobId]/final-content.json`                                       | `data/jobs/[jobId]/metadata.json`                              |

**재사용 관련**: 이 스키마는 Phase 1 **P1-T05**(Subagent 정의 시 출력 계약 명시), **P1-T09**(`lib/team/types.ts`에 import), **P1-T12**(`content-loader.ts`에서 `FinalContentSchema.parse()` 호출)에서 그대로 재사용한다.

### 9.2 voice.ts — 음성 합성

- 입력: `sentences[]`, `voiceId`, `speed?`
- 처리: 문장별 MeloTTS 호출 → 개별 wav → ffprobe duration → concat → 타이밍 맵
- 출력: `VoiceOutput` (audioPath, segmentTimings)

### 9.3 subtitle.ts — ASS 자막 생성

- 입력: `sentences[]`, `segmentTimings`, `style?`
- 처리: `assets/styles/subtitle.ass` 템플릿 문자열 치환
- 출력: `.ass` 파일 경로
- 스타일: Pretendard Bold, 흰 글자 + 검정 아웃라인 4px, 하단 25%

### 9.4 video.ts — FFmpeg 영상 합성

- 입력: `audioPath`, `subtitlePath`, `totalMs`, `jobId`, `itemIndex`
- 처리: ffmpeg-static spawn
  - 배경 영상: 랜덤 선택 + `-ss 랜덤시작 -t totalSec`
  - 스케일/크롭: `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`
  - 자막: `ass=[subtitlePath]`
  - 코덱: `libx264 CRF 22, aac 192k`
- 출력: `[yyyy-mm-dd]_[category]_[index].mp4`

### 9.5 orchestrator.ts — 파이프라인 실행

- `runPipeline(jobId)`:
  1. `content-loader.ts`로 `final-content.json` 읽기
  2. 5개 아이템에 대해 voice → subtitle → video 순차 실행
  3. 각 단계마다 `job_items.stage/progress` 갱신
  4. 완료 시 `jobs.status = 'completed'`
- `retryItem(jobId, itemIndex)`: 해당 아이템만 재실행 (단, 대본 재생성은 시나리오 F로 별도 트리거)

---

## 10. API 엔드포인트 명세

### POST `/api/team/trigger` ⭐NEW

시나리오 트리거 생성.

**요청 바디** (Zod `TeamTriggerSchema`):

```json
{
  "scenario": "A",
  "payload": {
    "category": "love-psychology",
    "count": 5,
    "settings": {
      "voiceId": "0",
      "speed": 1.0,
      "backgroundFilter": null
    }
  }
}
```

**응답**:

```json
{ "triggerId": "uuid-xxxx", "status": "queued" }
```

### GET `/api/team/status?triggerId=xxx` ⭐NEW

특정 트리거의 현재 상태 + 활성 Teammate 목록 반환.

**응답**:

```json
{
  "triggerId": "uuid-xxxx",
  "scenario": "A",
  "status": "running",
  "activeTeammates": ["trend-scout", "script-writer", "hook-critic"],
  "completedTeammates": ["trend-scout"],
  "startedAt": "2026-04-08T10:00:00Z",
  "outputPath": null
}
```

### GET `/api/jobs`

잡 목록 반환 (히스토리).

### GET `/api/jobs/[jobId]`

특정 잡 상태 폴링. 프론트에서 2초 간격 호출.

**응답**:

```json
{
  "jobId": "uuid-xxxx",
  "triggerId": "uuid-yyyy",
  "status": "running",
  "category": "love-psychology",
  "createdAt": "2026-04-08T10:00:00Z",
  "items": [
    {
      "index": 0,
      "stage": "voice",
      "progress": 60,
      "status": "running",
      "script": { "hook": "...", "sentences": ["..."] },
      "caption": "...",
      "hashtags": ["#연애심리", "#틱톡"],
      "outputPath": null,
      "error": null
    }
  ]
}
```

### GET `/api/analytics` ⭐NEW

누적 성과 데이터 반환.

**쿼리 파라미터**: `?period=7d|30d|all`

**응답**:

```json
{
  "period": "7d",
  "totalJobs": 14,
  "totalItems": 70,
  "categoryBreakdown": { "love-psychology": 20, "money-habits": 15, ... },
  "successRate": 0.92,
  "latestReport": "data/reports/weekly-2026-04-06.md"
}
```

### GET `/api/recommendations` ⭐NEW

추천 주제 + 훅 패턴 반환 (trend-analyst 산출물 기반).

### GET `/api/prompt-changes` ⭐NEW

prompt-tuner가 제안한 프롬프트 변경 목록 조회.

### POST `/api/prompt-changes/[id]/approve` ⭐NEW

제안 승인 → 실제 `.claude/agents/*.md` 적용.

### GET `/api/outputs/[filename]`

mp4 또는 mp3 파일 스트리밍. `<video src>` 태그에서 직접 호출. 경로 traversal 방지 검증 포함.

---

## 11. 데이터 모델 (SQLite)

### `jobs` 테이블

| 필드         | 설명            | 타입/예시                               |
| ------------ | --------------- | --------------------------------------- |
| id           | 고유 잡 식별자  | TEXT (UUID)                             |
| trigger_id   | 생성 트리거 ID  | TEXT → team_triggers.id                 |
| category     | 선택된 카테고리 | TEXT                                    |
| status       | 잡 전체 상태    | TEXT (pending/running/completed/failed) |
| settings     | 생성 설정 JSON  | TEXT (JSON)                             |
| created_at   | 생성 시각       | TEXT (ISO 8601)                         |
| completed_at | 완료 시각       | TEXT (nullable)                         |

### `job_items` 테이블

| 필드          | 설명               | 타입/예시                                |
| ------------- | ------------------ | ---------------------------------------- |
| id            | 아이템 식별자      | TEXT (UUID)                              |
| job_id        | 상위 잡 ID         | TEXT → jobs.id                           |
| item_index    | 아이템 순서 (0~4)  | INTEGER                                  |
| stage         | 현재 처리 단계     | TEXT (content/voice/subtitle/video/done) |
| progress      | 단계 내 진행률     | INTEGER (0~100)                          |
| status        | 아이템 상태        | TEXT (pending/running/completed/failed)  |
| script_json   | 대본 전문 JSON     | TEXT (JSON, nullable)                    |
| caption       | 캡션 텍스트        | TEXT (nullable)                          |
| hashtags_json | 해시태그 배열 JSON | TEXT (JSON, nullable)                    |
| output_path   | 최종 mp4 경로      | TEXT (nullable)                          |
| error_message | 실패 시 에러 내용  | TEXT (nullable)                          |
| updated_at    | 마지막 갱신 시각   | TEXT (ISO 8601)                          |

### `team_triggers` 테이블 ⭐NEW

| 필드             | 설명                         | 타입/예시                              |
| ---------------- | ---------------------------- | -------------------------------------- |
| id               | 트리거 ID                    | TEXT (UUID)                            |
| scenario         | 시나리오 코드                | TEXT (A/B/C/D/E/F)                     |
| payload          | 시나리오별 입력 JSON         | TEXT (JSON)                            |
| status           | 트리거 상태                  | TEXT (queued/running/completed/failed) |
| active_teammates | 현재 활성 Teammate JSON 배열 | TEXT (JSON)                            |
| output_path      | 산출물 경로                  | TEXT (nullable)                        |
| error_message    | 실패 메시지                  | TEXT (nullable)                        |
| created_at       | 생성 시각                    | TEXT (ISO 8601)                        |
| started_at       | 실제 시작 시각               | TEXT (nullable)                        |
| completed_at     | 완료 시각                    | TEXT (nullable)                        |

### `metrics` 테이블 ⭐NEW

사용자가 TikTok 업로드 후 수동 입력하는 성과 데이터.

| 필드                | 설명             | 타입/예시           |
| ------------------- | ---------------- | ------------------- |
| id                  | 메트릭 레코드 ID | TEXT (UUID)         |
| job_item_id         | 대상 아이템      | TEXT → job_items.id |
| uploaded_at         | 업로드 시각      | TEXT                |
| views_7d            | 7일 조회수       | INTEGER (nullable)  |
| completion_rate_7d  | 7일 완주율       | REAL (nullable)     |
| saves_7d            | 7일 저장수       | INTEGER (nullable)  |
| views_30d           | 30일 조회수      | INTEGER (nullable)  |
| completion_rate_30d | 30일 완주율      | REAL (nullable)     |
| saves_30d           | 30일 저장수      | INTEGER (nullable)  |
| notes               | 자유 메모        | TEXT (nullable)     |

### `prompt_changes` 테이블 ⭐NEW

prompt-tuner가 제안한 프롬프트 변경 이력.

| 필드        | 설명                       | 타입/예시       |
| ----------- | -------------------------- | --------------- |
| id          | 제안 ID                    | TEXT (UUID)     |
| target_file | 대상 `.claude/agents/*.md` | TEXT            |
| diff        | 변경 내용 diff             | TEXT            |
| rationale   | 제안 근거                  | TEXT            |
| status      | proposed/approved/rejected | TEXT            |
| proposed_at | 제안 시각                  | TEXT            |
| reviewed_at | 검토 시각                  | TEXT (nullable) |

### `metadata.json` (파일, 잡 단위)

```json
{
  "jobId": "uuid-xxxx",
  "triggerId": "uuid-yyyy",
  "category": "love-psychology",
  "generatedAt": "2026-04-08T10:15:00Z",
  "ai_generated": true,
  "contentQaReport": "content-qa-report.json",
  "items": [
    {
      "index": 0,
      "filename": "2026-04-08_love-psychology_1.mp4",
      "topic": "...",
      "script": { "hook": "...", "sentences": ["..."] },
      "caption": "...",
      "hashtags": ["#연애심리"],
      "hookVerdict": "PASS"
    }
  ]
}
```

---

## 12. UI 구조 — 7개 섹션 + 3개 서브페이지

```
[Header]
  로고 | 팀 상태 배지 🟢 4명 활성 | 테마 토글 | 설정 아이콘

┌──────────── 메인 페이지 (/) ────────────┐
│                                         │
│ [섹션 1 — CategoryPicker]                │
│   5개 카드 그리드 (아이콘 + 카테고리명)  │
│   선택 시 하이라이트 + 체크 표시          │
│                                         │
│ [섹션 2 — SettingsPanel]                 │
│   Collapsible (기본 접힘)                │
│   TTS 화자 Select | 속도 Slider          │
│   배경 필터 ToggleGroup                  │
│                                         │
│ [섹션 3 — GenerateButton]                │
│   "5개 자동 생성" 버튼 (크게)            │
│   카테고리 미선택 시 Zod 에러 표시        │
│                                         │
│ [섹션 4 — JobProgress]  -- 실행 중 표시  │
│   전체 Progress bar (%)                  │
│   Teammate별 상태 Badge                  │
│     🟢 trend-scout 완료                  │
│     🔵 script-writer 작업 중              │
│     ⚪ hook-critic 대기                  │
│     ...                                  │
│   아이템 5개 파이프라인 단계별 Badge      │
│   실패 아이템: 에러 + "재시도" 버튼       │
│                                         │
│ [섹션 5 — VideoCard × 5]                 │
│   <video> 미리보기 (9:16)                │
│   대본 보기 | 캡션 복사 | 다운로드 | 재생성│
│   (하단) ZIP 다운로드 버튼                │
│                                         │
│ [섹션 6 — AnalyticsPanel] ⭐NEW          │
│   최근 7일 / 30일 요약                    │
│   카테고리별 생성 빈도 차트               │
│   "상세 보기" → /analytics                │
│   "분석 실행" 버튼 (시나리오 C 트리거)    │
│                                         │
│ [섹션 7 — RecommendationPanel] ⭐NEW     │
│   다음 주제 Top-5 추천                    │
│   성공률 높은 훅 패턴                     │
│   prompt-tuner 제안 (승인 대기 배지)     │
│                                         │
└─────────────────────────────────────────┘

┌──────────── /analytics ─────────────────┐
│ 상세 대시보드                             │
│ - 기간 필터 (7d/30d/all)                  │
│ - 카테고리별 성과 차트                    │
│ - 주간 리포트 뷰어 (markdown 렌더링)      │
│ - 메트릭 수동 입력 폼                     │
└─────────────────────────────────────────┘

┌──────────── /history ────────────────────┐
│ 과거 잡 히스토리                          │
│ - 필터: 날짜 / 카테고리 / 상태            │
│ - 잡별 상세 (트리거 정보 + 아이템 목록)    │
│ - 편집/재생성 이력 (preference-learner용) │
└─────────────────────────────────────────┘

┌──────────── /settings ───────────────────┐
│ 팀 상태 + 시스템 설정                     │
│ - 활성 Teammate 목록 + 모델               │
│ - 시나리오 트리거 수동 실행               │
│ - 기능 요청 / 버그 리포트 폼 (시나리오 B) │
│ - prompt-tuner 제안 승인 인터페이스 ⭐    │
│ - TTS / 배경 / 파일 규칙 설정             │
└─────────────────────────────────────────┘
```

---

## 13. 환경 변수 (.env.example)

```bash
# ── Agent Teams (Claude Code 구독 내장) ──
# settings.json의 env 섹션 또는 셸 환경 변수로 설정
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# ── TTS ──
TTS_PROVIDER=melo
MELO_PYTHON_PATH=./.venv/bin/python
MELO_SCRIPT_PATH=./scripts/melo_tts.py
MELO_LANGUAGE=KR
MELO_SPEAKER_ID=0

# ── 배경 영상 (선택, 없으면 로컬 assets/backgrounds/ 풀만 사용) ──
PEXELS_API_KEY=
PIXABAY_API_KEY=

# ── FFmpeg (ffmpeg-static 사용 시 비워둠) ──
FFMPEG_PATH=

# ── 경로 ──
ASSETS_DIR=./assets
OUTPUT_DIR=./data/jobs
REPORTS_DIR=./data/reports
PREFERENCES_PATH=./data/preferences.json

# ── 팀 트리거 폴링 ──
TEAM_TRIGGER_POLL_INTERVAL_MS=2000
```

`.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

---

## 14. Phase별 마일스톤

### Phase 1 — MVP (현재 목표)

**완성 기준**: 대시보드 버튼 → Agent Teams 자동 발동 → 15분 이내 mp4 5개 + metadata.json 산출, 수동 업로드 가능

**Phase 1 예상 소요 확정 (C-6 / F-14.2)**: 베이스 **7.5 영업일** + 디버깅 버퍼 **1.5일** = **총 9 영업일 ≒ 2주**. 검증 리포트 F-14.2의 34~60시간 추정치 중 상한 + 20% 버퍼 채택.

> **Phase 1 범위 축소 확정 (C-4 / F-14.2)**: 시나리오 **A(콘텐츠 제작) + F(재생성)만 필수**. 시나리오 **C(분석)/D(개선)/B(개발)/E(퍼스널라이제이션)는 `.claude/agents/` 정의와 `/api/team/trigger` 스켈레톤만 준비**하고 실제 동작은 **Phase 2**에서 완성. 근거: 4.5~7.5 영업일 추정 중 약 3일이 "당장 필요 없는 기능"에 소모되는 것을 방지. P0-B4의 cron Phase 2 연기와 일관성 확보. `docs/ROADMAP.md §4` P1-T11·P1-T12 주석이 이를 전제로 작성되어 있다.

Shrimp Task Manager에 등록할 구현 태스크:

| 순서 | 태스크                       | 내용                                                                                                                                                                                                                                  |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------- | --------------- |
| 0    | Shrimp 초기화                | Phase 1 아래 태스크를 Shrimp에 등록 + 의존성 설정                                                                                                                                                                                     |
| 1    | 스타터 복사                  | `nextjs-starters_2026-03-11` → 프로젝트 루트. `.claude/`, `.mcp.json`, `.shrimp_data/` 보존 필수                                                                                                                                      |
| 2    | 의존성 설치                  | zustand, better-sqlite3, ffmpeg-static, zod, archiver (ZIP) 설치                                                                                                                                                                      |
| 3    | MeloTTS 셋업                 | `scripts/setup-melo.sh` 실행: Python venv + MeloTTS + 한국어 모델 캐시                                                                                                                                                                |
| 4    | Agent Teams 활성화 확인      | 전역 `~/.claude/settings.json`에서 이미 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 활성화됨 (확인 완료). Claude Code v2.1.85 설치됨(최소 v2.1.32 충족). **프로젝트 레벨 `.claude/settings.json` 생성은 선택사항** (명시성 원함 시 추가) |
| 5    | Subagent 정의 11개 신규 작성 | `.claude/agents/` 하위에 content/dev/analytics/personalization 4개 폴더 + **11개 `.md` 파일** (기존 `dev/code-reviewer.md`는 재사용). 기존 10개 범용 에이전트는 보존 → 총 21개 풀                                                     |
| 6    | 슬래시 커맨드 4개 작성       | `.claude/commands/tiktok-generate                                                                                                                                                                                                     | dev | analyze | team-status.md` |
| 7    | Hook 작성                    | `.claude/hooks/session-start-poll.sh` — queued 트리거 자동 픽업                                                                                                                                                                       |
| 8    | DB 구현                      | `lib/db/schema.sql` (jobs, job_items, team_triggers, metrics, prompt_changes), `client.ts`, `repo.ts`                                                                                                                                 |
| 9    | Team 모듈 구현               | `lib/team/trigger-repo.ts`, `scenarios.ts`, `types.ts`                                                                                                                                                                                |
| 10   | 프로바이더 구현              | `lib/providers/tts/melo-tts.ts`, `ffmpeg.ts`, `background.ts`                                                                                                                                                                         |
| 11   | 환경 검증                    | `scripts/seed-assets.ts`: Agent Teams 활성화, Python venv, MeloTTS, libass, 폰트, 배경 확인                                                                                                                                           |
| 12   | 파이프라인 구현              | `lib/pipeline/` 4개 모듈 (content-loader, voice, subtitle, video) + orchestrator                                                                                                                                                      |
| 13   | API 라우트 구현              | `/api/team/trigger`, `/api/team/status`, `/api/jobs/*`, `/api/outputs/*`                                                                                                                                                              |
| 14   | UI 메인 페이지 구현          | `app/page.tsx` + `components/pipeline/*` + 7개 섹션                                                                                                                                                                                   |
| 15   | Zustand 스토어               | 4개 스토어 구현                                                                                                                                                                                                                       |
| 16   | 서브페이지 구현              | `/analytics`, `/history`, `/settings` (최소 스켈레톤)                                                                                                                                                                                 |
| 17   | 에셋 확보                    | `assets/backgrounds/` 10개, `Pretendard-Bold.otf`, `subtitle.ass` 템플릿                                                                                                                                                              |
| 18   | Leader 세션 테스트           | `claude` 실행 → `Create an agent team named tiktok-ops-team ...` → `/tiktok-team-status` 정상 응답 확인                                                                                                                               |
| 19   | 시나리오 A E2E               | 대시보드 버튼 → Leader 감지 → 5명 spawn → mp4 5개 산출 → DoD 15개 체크                                                                                                                                                                |
| 20   | TikTok 수동 업로드 1회 성공  | AI 공시 토글 체크 + 캡션/해시태그 붙여넣기                                                                                                                                                                                            |

### Phase 2 — 품질 개선 (무료 원칙 유지)

- MeloTTS warm keep (Python 상주 프로세스, 회차당 30~50% 시간 단축)
- 카테고리별 화자/속도 프리셋
- ASS 카라오케 자막
- BGM 추가
- Pexels/Pixabay 자동 배경 + 카테고리 태그 추천
- 썸네일 자동 추출
- hook-critic A/B 3종 훅 생성 모드
- 시나리오 B(개발) 활용: 위 기능들을 Agent Teams에 의뢰하여 구현

### Phase 3 — 피드백 루프 및 맞춤화

- 사용자 성과 수동 입력 UI 고도화 + 시나리오 C 주간 리포트 자동 생성
- preference-learner가 편집 diff 기반 선호 학습
- prompt-tuner가 `.claude/agents/*.md` 개선 제안 → 승인 UI
- 카테고리별 훅 패턴 시각화 리포트
- 시나리오 D(프롬프트 개선) 자동 연쇄

---

## 15. 위험 요소 및 대응

| 위험                                                  | 가능성         | 대응                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent Teams 실험적 기능 불안정성                      | 중             | 공식 문서 상 실험 기능. 세션 재개/종료 이슈 대비하여 `team_triggers` 테이블에 충분한 상태 정보 저장. Leader 재시작 시 queued 트리거부터 복구                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Leader 세션 미실행으로 트리거 적체                    | 중             | 대시보드 헤더에 "팀 상태" 배지 표시. Leader 미감지 시 빨간색 경고 + "Claude Code 세션 실행 안내" 모달                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Max 플랜 사용량 한도 도달                             | 낮음~중        | 시나리오 A/F의 Teammate 수를 최소화. 토큰 대량 소비 시나리오(C, D)는 하루 1회로 제한                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **R-15: 시나리오 B plan mode × Opus 토큰 폭증 (C-5)** | 중             | **정책 (b) 실측 대기 채택**: plan mode × Opus 중첩으로 이론상 토큰 약 7배 소비 위험. Phase 1에서는 **하드 제한 없이 수동 주의만** 수행 (시나리오 B 실행 시 대시보드 Toast로 "토큰 대량 소비 경고" 표시). Phase 2 P2-T08에서 ScenarioB `activation: 'active'` 승격 + `feature-request-form` 실 가동 + R-18 토스트 추가 완료. **실측 절차/결과/정책 표는 [`docs/r15-scenario-b-measurement.md`](r15-scenario-b-measurement.md)** 에 누적. 실측 후 (가) 일일 1회 하드 제한, (나) frontend/backend builder 중 1명만 plan mode, (다) Sonnet 다운그레이드 중 재결정 |
| MeloTTS 콜드 스타트 5~10초                            | 높음 (Phase 1) | 허용. Phase 2에서 warm keep으로 해결                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| MeloTTS 모델 다운로드 ~500MB                          | 1회성          | `setup-melo.sh`에서 최초 실행 시 1회만 수행                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 배경 영상 부족                                        | 낮음           | 로컬 풀 10~20개 + Pexels API 캐시 병행                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| TikTok AI 콘텐츠 공시 누락                            | 중             | `metadata.json`에 `ai_generated: true` 자동 포함 (content-qa가 설정). 수동 업로드 체크리스트 안내                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 대본 저작권 침해                                      | 낮음           | content-qa Teammate의 저작권 체크 단계 + 수동 검수                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| libass 미설치                                         | 낮음           | `seed-assets.ts`에서 사전 확인, 설치 안내 메시지 출력                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 시나리오 B(개발) Teammate가 파일 충돌 발생            | 중             | Q2 확정한 **계획 승인 모드**로 사전 방지. frontend/backend-builder가 서로 다른 파일 영역 담당하도록 Leader가 분리                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| prompt-tuner가 부적절한 프롬프트 수정 제안            | 낮음~중        | Q4 확정: 자동 적용 금지. `prompt_changes` 테이블에 제안만 저장 → 사용자 승인 필요                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **R-19: prompt-tuner 승인 후 git 충돌 (C-1 확정)**    | 낮음~중        | **정책 (c) 채택**: 승인 후 적용 시점에 사용자 미커밋 변경분과 충돌하면, 자동으로 `prompt-tuner/YYYY-MM-DD-HHMM` 형식의 신규 git 브랜치를 생성하고 그 브랜치에 제안을 적용. 사용자가 수동으로 머지/리베이스 수행. 자동 머지·수동 차단 모두 솔로 개발자에게 부적절. Phase 3 prompt-tuner 승인 API에서 구현                                                                                                                                                                                                                                                      |
| 공유 작업 목록과 Shrimp 이중화 혼란                   | 낮음           | §8.7에서 역할 분리 원칙 명시. 개발 시 엄격 준수                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **cron 자동 등록 미구현 (F-14.4)**                    | 해소됨         | **Phase 2 연기 확정** (Q3 하이브리드 중 자동 부분). 후보 (a)macOS launchd는 서버 OFF 시 동작 불가, (b)node-cron은 dev 서버 재시작에 취약 → (c) 채택: Phase 1 DoD에서 cron 제외, 수동 "분석 실행" 버튼만 검증. Phase 2에서 재평가                                                                                                                                                                                                                                                                                                                              |

---

## 16. 범위 외 항목

아래 항목은 명시적으로 이번 MVP 및 추후 Phase에서도 제외됨.

- **자동 업로드**: TikTok API 자동 게시. 수동 업로드로 확정
- **업로드 스케줄러**: 특정 시간 자동 게시 예약
- **모바일 앱**: iOS/Android 앱
- **다중 계정 관리**: 단일 계정 원칙
- **외부 사용자**: 멀티 테넌트, 로그인/회원가입
- **클라우드 배포**: Vercel, AWS 등 외부 서버 (Phase 1 기준)
- **실시간 알림**: 푸시 알림, 이메일
- **Agent SDK 기반 구현**: 구독 내장 Agent Teams만 사용. `@anthropic-ai/claude-agent-sdk` npm 패키지 사용 금지
- **API 키 기반 Claude 호출**: Anthropic API 직접 과금 방식 금지 (유료 전환 기준 충족 시까지)
- **자동 TikTok 성과 수집**: 수동 입력만 (Phase 3도 동일)

---

## 17. 재사용 자원 및 기존 세팅

### 보존 필수 (이미 세팅됨)

| 경로                          | 내용                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `.claude/settings.local.json` | Bash(node:\*) 권한 허용                                                                                                   |
| `.claude/agents/`             | **기존 범용 Subagent 10개** (ohajo에서 복사됨) — 옵션 C 확정에 따라 전원 보존하여 tiktok-ops-team 풀에 합류 (§8.2.1 참조) |
| `.mcp.json`                   | Shrimp Task Manager MCP 등록 (한국어 템플릿, GUI off)                                                                     |
| `.shrimp_data/`               | Shrimp 태스크 DB (현재 비어 있음, gitignore 대상)                                                                         |

Shrimp MCP 바이너리: `/Users/jungmo/mcp-shrimp-task-manager/dist/index.js`

**전역 Agent Teams 활성화** (확인 완료, 이 프로젝트에서 자동 상속):

- `~/.claude/settings.json` → `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1"`
- Claude Code 버전: 2.1.85 (요구 버전 2.1.32 이상 충족)
- `~/.claude/teams/` 에 실제 팀 생성 이력 확인됨 (ohajo-sim 등)

### 복사/참조할 기존 프로젝트

| 경로                                               | 활용 방법                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `nextjs-starters_2026-03-11/`                      | 전체 템플릿 베이스 복사. Zustand 미포함이므로 별도 설치 필요            |
| `seoul-airbnb_2026-02-19/.../wizardStore.ts`       | Zustand 스토어 패턴 참조                                                |
| `seoul-airbnb_2026-02-19/.../api/geocode/route.ts` | API 라우트 캐싱/에러 처리 패턴 참조                                     |
| **`ohajo/.claude/commands/ohajo.md`** ⭐           | Team Lead + Teammate 역할 체계, Plan-Execute 2단계 워크플로우 패턴 참조 |
| **`ohajo/.claude/agents/**`\*\* ⭐                 | Subagent 정의 파일 구조, frontmatter 포맷 참조                          |

### 새로 구현할 것

- `.claude/agents/` **11개 신규** Subagent 정의 (기존 `dev/code-reviewer.md`는 재사용)
- `.claude/commands/` 4개 슬래시 커맨드
- `.claude/hooks/session-start-poll.sh` 자동 발동 훅
- `lib/team/` 모듈 (trigger-repo, scenarios, types)
- MeloTTS Python 래퍼 + Node provider
- FFmpeg 통합 전체
- SQLite 잡 큐 + team_triggers + metrics + prompt_changes
- 파이프라인 4개 결정론 모듈 + orchestrator
- 대시보드 메인 페이지 7개 섹션 + 3개 서브페이지
- 에셋 (배경 영상 10개+, Pretendard-Bold.otf, subtitle.ass 템플릿)
