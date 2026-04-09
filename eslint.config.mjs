import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prettier와 충돌하는 ESLint 포맷팅 규칙 비활성화 (반드시 마지막에 위치).
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // 프로젝트 외부 자산 (런타임/데이터/가상환경)
    'node_modules/**',
    '.venv/**',
    'data/**',
    '.shrimp_data/**',
    'assets/**',
    // Claude Code 로컬 전용
    '.claude/plans/**',
    '.claude/logs/**',
  ]),
]);

export default eslintConfig;
