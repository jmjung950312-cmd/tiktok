// scripts/init-db.ts
// data/db.sqlite를 스키마 기반으로 초기화.
// 실행: npm run db:init (= tsx scripts/init-db.ts)
// 이미 존재하면 스키마는 IF NOT EXISTS로 멱등 처리.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.sqlite');
const SCHEMA_PATH = path.resolve(process.cwd(), 'lib/db/schema.sql');

if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
  console.log(`[init-db] 디렉토리 생성: ${DB_DIR}`);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

const tables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  .all() as Array<{ name: string }>;

console.log(`[init-db] ${DB_PATH} 초기화 완료`);
console.log(`[init-db] 테이블 ${tables.length}개: ${tables.map((t) => t.name).join(', ')}`);

const journal = db.pragma('journal_mode', { simple: true });
console.log(`[init-db] journal_mode = ${journal}`);

db.close();
