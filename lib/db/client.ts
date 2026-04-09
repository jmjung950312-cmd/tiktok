// lib/db/client.ts
// better-sqlite3 싱글톤 클라이언트. WAL 모드 활성화.
// Next.js Server Components / API Routes / CLI 스크립트 공통 사용.

import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.sqlite');
const SCHEMA_PATH = path.resolve(process.cwd(), 'lib/db/schema.sql');

let dbInstance: DatabaseType | null = null;

/**
 * 싱글톤 DB 연결 반환.
 * 최초 호출 시 data/db.sqlite 없으면 스키마 파일 실행.
 */
export function getDb(): DatabaseType {
  if (dbInstance) return dbInstance;

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  const shouldInit = !existsSync(DB_PATH);

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  if (shouldInit) {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    dbInstance.exec(schema);
  }

  return dbInstance;
}

/**
 * 테스트 / 스크립트에서 명시적으로 닫을 때 사용.
 * Next.js 런타임에서는 호출하지 않는다.
 */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
