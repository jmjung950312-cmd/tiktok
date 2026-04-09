# TikTok 자동화 파이프라인 — 프로젝트 지침

## 프로젝트 개요

Next.js 15 + React 19 + Claude Code Agent Teams 기반 TikTok 숏폼 자동 생성 파이프라인.
**완전 무료 원칙** (유료 API 금지, Pexels 무료 tier 만 허용).

## 핵심 문서 (자동 참조)

- @docs/PRD.md — 제품 명세 (17개 섹션, 1,200+ 줄)
- @docs/ROADMAP.md — 개발 로드맵 (Phase 0~3, 태스크 + 의존성)
- @docs/PRD_VALIDATION_REPORT.md — 기술 검증 리포트 (사실/결정/위험 매트릭스)

## 코딩 규칙

- **TypeScript strict** (`any` 금지, 명시적 return 타입)
- **한국어 주석** (코드 주석, 커밋 메시지, 문서 모두 한국어)
- 변수/함수명: 영어 camelCase / PascalCase
- **UI**: Tailwind CSS + shadcn/ui
- **상태관리**: Zustand
- **폼**: React Hook Form + Zod
- 컴포넌트 분리 및 재사용 원칙
- 반응형 필수

## 파이프라인 특수 규칙 (중요)

1. **결정론 파이프라인 실행 중엔 섣부른 패치 금지** — MeloTTS/FFmpeg 에러는 retry 로 복구됨. venv 재설치 전 반드시 `.venv/bin/python` 으로 재확인.
2. **Subagent 경로**: `.claude/agents/<team>/<name>.md` 구조 (비공식 서브폴더 인식 기반).
3. **prompt-tuner 관할 파일**: `.claude/agents/content/*.md` — 이 영역 편집은 prompt-tuner 제안을 통해서만.
4. **Leader 세션은 tmux 'tiktok-leader'** 에서 launchd 데몬으로 유지.

## Hook 시스템

이 프로젝트는 `.claude/hooks/` 에 5개 자동 안전장치가 있습니다:

| Hook                    | 이벤트       | 역할                                                                   |
| ----------------------- | ------------ | ---------------------------------------------------------------------- |
| `session-start-poll.sh` | SessionStart | Leader 큐 폴링 (R-13 stale 복구 + FIFO)                                |
| `session-context.sh`    | SessionStart | 프로젝트 상태 스냅샷을 컨텍스트로 주입                                 |
| `pre-tool-guard.sh`     | PreToolUse   | 위험 명령 차단 (rm data/.venv, DROP TABLE, Desktop 경로, .env 편집 등) |
| `post-format.sh`        | PostToolUse  | ts/tsx → Prettier + ESLint --fix, json/md → Prettier                   |
| `stop-validate.sh`      | Stop         | 편집이 있었던 세션에만 typecheck + lint 강제                           |

상세 문서: `.claude/hooks/README.md`

## 자주 쓰는 명령

### 슬래시 커맨드

- `/tiktok-generate <카테고리>` — 시나리오 A: 5개 숏폼 자동 생성
- `/tiktok-analyze` — 시나리오 C: 주간 metrics 리포트
- `/tiktok-dev <요청>` — 시나리오 B: plan 모드 기능 개발
- `/tiktok-team-status` — 현재 팀 상태 Markdown 테이블

### npm 스크립트

- `npm run dev` — Next.js 개발 서버
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`
- `npm run seed:assets` — Agent Teams/Python/MeloTTS/폰트/배경 환경 검증
- `npm run db:init` — SQLite 스키마 초기화
- `npm run setup:melo` — MeloTTS 1회성 셋업 (Python venv + 한국어 모델)

### 운영 스크립트

- `./scripts/install-leader-daemon.sh` — launchd Leader 데몬 설치
- `./scripts/install-cron-analyze.sh` — 주간 cron 설치 (매주 월 09:00)
- `./scripts/run-pipeline-once.ts` — 결정론 파이프라인 일회성 실행

## Git 워크플로

- 저장소: https://github.com/jmjung950312-cmd/tiktok
- 브랜치: `main` (1인 프로젝트이므로 직접 커밋 OK)
- **`data/`, `.venv/`, `.shrimp_data/`, `*.mp4`, `*.wav`, `.env*` 는 gitignore** (DB/미디어/비밀 값 로컬 전용)
- 커밋 메시지는 한국어, conventional commit 권장 (`feat:`, `fix:`, `chore:`, `docs:`)

## 디렉토리 구조 요약

```
.claude/          Claude Code 설정 (hooks, agents, commands, settings)
app/              Next.js App Router 페이지 + API 라우트
components/       React UI (analytics, pipeline, sections, ui)
lib/              핵심 로직 (db, pipeline, team, providers)
store/            Zustand 스토어
scripts/          셋업/테스트/파이프라인 스크립트 (tsx, bash, python)
docs/             PRD, ROADMAP, 검증 리포트, Phase 결과
data/             SQLite DB + jobs 산출물 (gitignore)
templates/        launchd plist 템플릿
assets/           배경/BGM (일부 gitignore)
```

## 알아야 할 위험/제약

- **R-13**: Leader tmux 세션이 끊기면 team_triggers가 running 상태로 stale 됨 → `session-start-poll.sh` 가 15분 임계로 복구
- **R-15**: 시나리오 B(plan 모드 × Opus 중첩) 토큰 소비 7배 추정 — 수동 확인 권장
- **R-16**: Subagent 서브폴더 인식이 비공식 — `.claude/agents/<team>/*.md` 구조 동작 확인 필수
