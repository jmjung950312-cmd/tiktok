-- TikTok 자동화 파이프라인 SQLite 스키마
-- PRD §11 참조, WAL 모드로 폴링 읽기와 쓰기 동시성 확보

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 잡 전체 단위 (1 카테고리 = 1 잡, 1 잡에 5 아이템)
CREATE TABLE IF NOT EXISTS jobs (
  id           TEXT PRIMARY KEY,
  trigger_id   TEXT NOT NULL,
  category     TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed')),
  settings     TEXT NOT NULL DEFAULT '{}', -- JSON
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (trigger_id) REFERENCES team_triggers(id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- 아이템 단위 (1 잡 = 5 아이템)
CREATE TABLE IF NOT EXISTS job_items (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL,
  item_index    INTEGER NOT NULL CHECK (item_index BETWEEN 0 AND 4),
  stage         TEXT NOT NULL CHECK (stage IN ('content','voice','subtitle','video','done')),
  progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status        TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed')),
  script_json   TEXT,          -- JSON (훅 + 5문장)
  caption       TEXT,
  hashtags_json TEXT,          -- JSON 배열
  output_path   TEXT,          -- 최종 mp4 경로
  error_message TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE (job_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_job_items_job_id  ON job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_job_items_status  ON job_items(status);
CREATE INDEX IF NOT EXISTS idx_job_items_updated ON job_items(updated_at DESC);

-- 시나리오 트리거 큐 (Hook ↔ Leader ↔ API 3자 통신 hub, R-14 FIFO 직렬화)
CREATE TABLE IF NOT EXISTS team_triggers (
  id                TEXT PRIMARY KEY,
  scenario          TEXT NOT NULL CHECK (scenario IN ('A','B','C','D','E','F')),
  payload           TEXT NOT NULL,  -- JSON
  status            TEXT NOT NULL CHECK (status IN ('queued','running','completed','failed')),
  active_teammates  TEXT DEFAULT '[]', -- JSON 배열
  output_path       TEXT,
  error_message     TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  started_at        TEXT,
  completed_at      TEXT
);

-- FIFO 큐 조회 최적화: WHERE status='queued' ORDER BY created_at ASC LIMIT 1
CREATE INDEX IF NOT EXISTS idx_team_triggers_status_created
  ON team_triggers(status, created_at);

-- 사용자 수동 입력 TikTok 성과 (Phase 3부터 활용)
CREATE TABLE IF NOT EXISTS metrics (
  id                   TEXT PRIMARY KEY,
  job_item_id          TEXT NOT NULL,
  uploaded_at          TEXT NOT NULL,
  views_7d             INTEGER,
  completion_rate_7d   REAL,
  saves_7d             INTEGER,
  views_30d            INTEGER,
  completion_rate_30d  REAL,
  saves_30d            INTEGER,
  notes                TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_item_id) REFERENCES job_items(id)
);

CREATE INDEX IF NOT EXISTS idx_metrics_job_item   ON metrics(job_item_id);
CREATE INDEX IF NOT EXISTS idx_metrics_uploaded   ON metrics(uploaded_at DESC);

-- prompt-tuner 제안 이력 (Phase 3, Q4 확정: 사용자 승인 후 적용)
CREATE TABLE IF NOT EXISTS prompt_changes (
  id           TEXT PRIMARY KEY,
  target_file  TEXT NOT NULL,       -- .claude/agents/*.md 경로
  diff         TEXT NOT NULL,       -- unified diff
  rationale    TEXT NOT NULL,       -- 한국어 근거
  status       TEXT NOT NULL CHECK (status IN ('proposed','approved','rejected')),
  proposed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_prompt_changes_status ON prompt_changes(status, proposed_at DESC);
