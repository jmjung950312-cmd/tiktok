// scripts/seed-assets.ts
// 환경 검증 전용 CLI. npm run seed:assets 로 실행.
// DoD 2 대응: Python venv, MeloTTS, ffmpeg libass, 폰트, 배경 10+ 전부 체크.
// Phase 1 범위 축소(C-4)에 따라 Agent Teams 활성화 여부는 사용자 홈 settings.json
// 에서 확인하는 "안내성" 체크로 유지.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { getFfmpegPath, spawnFfmpeg } from '../lib/providers/ffmpeg';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  hint?: string;
}

const PROJECT_ROOT = path.resolve(process.cwd());
const REQUIRED_BACKGROUND_COUNT = 10;

function mark(status: CheckStatus): string {
  switch (status) {
    case 'pass':
      return '[✓]';
    case 'warn':
      return '[~]';
    case 'fail':
      return '[✗]';
  }
}

function print(result: CheckResult): void {
  // 한국어 출력
  console.log(`${mark(result.status)} ${result.name}: ${result.message}`);
  if (result.status !== 'pass' && result.hint) {
    console.log(`    ↳ ${result.hint}`);
  }
}

// ========== 체크 함수들 ==========

function checkAgentTeamsFlag(): CheckResult {
  // Agent Teams 는 Claude Code 프로세스가 기동 시점에 환경 변수를 읽는다.
  // 본 스크립트(Node)는 이를 직접 검증할 수 없으므로 ~/.claude/settings.json 의
  // env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 필드를 간접적으로 확인한다.
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  if (!existsSync(settingsPath)) {
    return {
      name: 'Agent Teams 활성화',
      status: 'warn',
      message: `~/.claude/settings.json 파일이 없음`,
      hint: `env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" } 추가 필요`,
    };
  }
  try {
    const raw = JSON.parse(readFileSync(settingsPath, 'utf-8')) as {
      env?: Record<string, string>;
    };
    const value = raw.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    if (value === '1' || value === 'true') {
      return {
        name: 'Agent Teams 활성화',
        status: 'pass',
        message: `~/.claude/settings.json 에 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS="${value}"`,
      };
    }
    return {
      name: 'Agent Teams 활성화',
      status: 'warn',
      message: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 값: ${value ?? '(없음)'}`,
      hint: `~/.claude/settings.json 의 env 에 "1" 로 설정하세요`,
    };
  } catch (err) {
    return {
      name: 'Agent Teams 활성화',
      status: 'warn',
      message: `settings.json 파싱 실패: ${(err as Error).message}`,
    };
  }
}

function checkPythonVenv(): CheckResult {
  const pythonBin = path.join(PROJECT_ROOT, '.venv', 'bin', 'python');
  if (!existsSync(pythonBin)) {
    return {
      name: 'Python venv (.venv)',
      status: 'fail',
      message: `${pythonBin} 이 존재하지 않음`,
      hint: `bash scripts/setup-melo.sh 를 실행하세요`,
    };
  }
  const res = spawnSync(pythonBin, ['--version'], { encoding: 'utf-8' });
  if (res.status !== 0) {
    return {
      name: 'Python venv (.venv)',
      status: 'fail',
      message: `python --version 실행 실패 (exit=${res.status})`,
      hint: `bash scripts/setup-melo.sh 로 venv 재생성`,
    };
  }
  const version = (res.stdout || res.stderr || '').trim();
  return {
    name: 'Python venv (.venv)',
    status: 'pass',
    message: version,
  };
}

function checkMeloImport(): CheckResult {
  const pythonBin = path.join(PROJECT_ROOT, '.venv', 'bin', 'python');
  if (!existsSync(pythonBin)) {
    return {
      name: 'MeloTTS import',
      status: 'fail',
      message: `Python venv 없음 → import 불가`,
      hint: `bash scripts/setup-melo.sh 먼저 실행`,
    };
  }
  const res = spawnSync(pythonBin, ['-c', 'import melo; import melo.api; print("melo-ok")'], {
    encoding: 'utf-8',
  });
  if (res.status !== 0) {
    return {
      name: 'MeloTTS import',
      status: 'fail',
      message: `import melo 실패`,
      hint: `bash scripts/setup-melo.sh 내 pip install 단계 재실행`,
    };
  }
  return {
    name: 'MeloTTS import',
    status: 'pass',
    message: (res.stdout || '').trim() || 'melo-ok',
  };
}

async function checkFfmpegLibass(): Promise<CheckResult> {
  try {
    const ffmpeg = getFfmpegPath();
    const { stderr, stdout } = await spawnFfmpeg(['-hide_banner', '-buildconf'], {
      capture: true,
    });
    const combined = `${stdout}\n${stderr}`;
    if (!combined.includes('libass') && !combined.includes('enable-libass')) {
      // ffmpeg-static 5.x 번들은 libass 미포함 가능. `ass` 필터 지원은 별도 확인.
      const filters = await spawnFfmpeg(['-hide_banner', '-filters'], {
        capture: true,
      });
      if (filters.stdout.includes(' ass ') || filters.stderr.includes(' ass ')) {
        return {
          name: 'ffmpeg libass/ass 필터',
          status: 'pass',
          message: `ffmpeg 에 ass 필터가 사용 가능 (${ffmpeg})`,
        };
      }
      return {
        name: 'ffmpeg libass/ass 필터',
        status: 'fail',
        message: `ffmpeg 바이너리에 libass/ass 필터가 없음`,
        hint: `brew install ffmpeg 로 libass 포함 ffmpeg 를 설치하거나, env FFMPEG_PATH 지정`,
      };
    }
    return {
      name: 'ffmpeg libass',
      status: 'pass',
      message: `libass 빌드 포함 (${ffmpeg})`,
    };
  } catch (err) {
    return {
      name: 'ffmpeg libass',
      status: 'fail',
      message: `ffmpeg 확인 실패: ${(err as Error).message}`,
      hint: `lib/providers/ffmpeg.ts / ffmpeg-static 설치 상태 확인`,
    };
  }
}

function checkFont(): CheckResult {
  const fontPath = path.join(PROJECT_ROOT, 'assets/fonts/Pretendard-Bold.otf');
  if (!existsSync(fontPath)) {
    return {
      name: 'Pretendard-Bold.otf',
      status: 'fail',
      message: `${fontPath} 없음`,
      hint: `https://github.com/orioncactus/pretendard 릴리스에서 Pretendard-Bold.otf 다운로드 후 배치`,
    };
  }
  const size = statSync(fontPath).size;
  return {
    name: 'Pretendard-Bold.otf',
    status: 'pass',
    message: `${(size / 1024).toFixed(0)} KB`,
  };
}

function checkBackgrounds(): CheckResult {
  const dir = path.join(PROJECT_ROOT, 'assets/backgrounds');
  if (!existsSync(dir)) {
    return {
      name: '배경 영상 풀',
      status: 'fail',
      message: `${dir} 없음`,
      hint: `Pexels/Pixabay 에서 9:16 mp4 ${REQUIRED_BACKGROUND_COUNT}개 이상 다운로드 후 배치`,
    };
  }
  const mp4s = readdirSync(dir).filter((name) => /\.(mp4|mov|webm)$/i.test(name));
  if (mp4s.length >= REQUIRED_BACKGROUND_COUNT) {
    return {
      name: '배경 영상 풀',
      status: 'pass',
      message: `${mp4s.length}개 파일 확인`,
    };
  }
  if (mp4s.length >= 3) {
    return {
      name: '배경 영상 풀',
      status: 'warn',
      message: `${mp4s.length}개 (최소 ${REQUIRED_BACKGROUND_COUNT}개 권장)`,
      hint: `P1-T04 가이드 참조하여 무료 스톡 mp4 추가 다운로드`,
    };
  }
  return {
    name: '배경 영상 풀',
    status: 'fail',
    message: `${mp4s.length}개만 존재 (3개 미만)`,
    hint: `assets/backgrounds/README.md 가이드 따라 mp4 추가`,
  };
}

function checkPexelsKey(): CheckResult {
  // P2-T04: PEXELS_API_KEY는 선택. 없으면 로컬 배경 풀만 사용(실패 아님).
  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    return {
      name: 'Pexels API 키',
      status: 'warn',
      message: 'PEXELS_API_KEY 환경변수 미설정',
      hint: 'docs/pexels-setup.md 참고하여 무료 키 발급 후 .env.local에 추가(선택)',
    };
  }
  if (key.length < 20) {
    return {
      name: 'Pexels API 키',
      status: 'warn',
      message: 'PEXELS_API_KEY 형식이 비정상적으로 짧음',
      hint: 'Pexels 대시보드에서 키 재확인',
    };
  }
  return {
    name: 'Pexels API 키',
    status: 'pass',
    message: `PEXELS_API_KEY 설정됨 (${key.length}자)`,
  };
}

function checkBgmPool(): CheckResult {
  // P2-T03: BGM 풀은 선택 사항. 0개여도 pipeline은 2-input 폴백으로 정상 동작.
  const dir = path.join(PROJECT_ROOT, 'assets/bgm');
  if (!existsSync(dir)) {
    return {
      name: 'BGM 풀 (assets/bgm)',
      status: 'warn',
      message: '디렉토리 없음 — BGM 없이 영상 생성',
      hint: 'assets/bgm/README.md 가이드에 따라 CC0 음원 10~20개 다운로드',
    };
  }
  const files = readdirSync(dir).filter((name) => /\.(mp3|m4a|wav|ogg)$/i.test(name));
  if (files.length === 0) {
    return {
      name: 'BGM 풀 (assets/bgm)',
      status: 'warn',
      message: '0개 파일 — BGM 없이 영상 생성',
      hint: 'FreePD / Pixabay Music / Mixkit 무료 음원 다운로드 후 배치',
    };
  }
  if (files.length < 3) {
    return {
      name: 'BGM 풀 (assets/bgm)',
      status: 'warn',
      message: `${files.length}개 (최소 10개 권장)`,
      hint: '다양성 확보를 위해 CC0 음원 추가 다운로드',
    };
  }
  return {
    name: 'BGM 풀 (assets/bgm)',
    status: 'pass',
    message: `${files.length}개 파일 확인`,
  };
}

function checkSubtitleTemplate(): CheckResult {
  const tmpl = path.join(PROJECT_ROOT, 'assets/styles/subtitle.ass');
  if (!existsSync(tmpl)) {
    return {
      name: '자막 템플릿 subtitle.ass',
      status: 'fail',
      message: `${tmpl} 없음`,
      hint: `P1-T04 산출물 재확인`,
    };
  }
  const raw = readFileSync(tmpl, 'utf-8');
  if (!raw.includes('{DIALOGUE_LINES}')) {
    return {
      name: '자막 템플릿 subtitle.ass',
      status: 'fail',
      message: `{DIALOGUE_LINES} 플레이스홀더 누락`,
      hint: `lib/pipeline/subtitle.ts 가 치환할 자리 필요`,
    };
  }
  return {
    name: '자막 템플릿 subtitle.ass',
    status: 'pass',
    message: `${raw.length} bytes, 플레이스홀더 OK`,
  };
}

// ========== 메인 ==========

async function main(): Promise<void> {
  console.log('=== TikTok 자동화 환경 검증 (npm run seed:assets) ===\n');

  const results: CheckResult[] = [];
  results.push(checkAgentTeamsFlag());
  results.push(checkPythonVenv());
  results.push(checkMeloImport());
  results.push(await checkFfmpegLibass());
  results.push(checkFont());
  results.push(checkBackgrounds());
  results.push(checkPexelsKey());
  results.push(checkBgmPool());
  results.push(checkSubtitleTemplate());

  for (const r of results) print(r);

  const failed = results.filter((r) => r.status === 'fail');
  const warned = results.filter((r) => r.status === 'warn');

  console.log('\n=== 요약 ===');
  console.log(`PASS: ${results.length - failed.length - warned.length}`);
  console.log(`WARN: ${warned.length}`);
  console.log(`FAIL: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n[실패] 위 ✗ 항목을 먼저 해결한 뒤 재실행하세요.');
    process.exit(1);
  }
  if (warned.length > 0) {
    console.log('\n[경고] 실행은 가능하지만 권장 세팅을 충족하지 못했습니다.');
  }
  console.log('\n[완료] 환경 검증 통과.');
}

main().catch((err: Error) => {
  console.error(`[치명적 오류] ${err.message}`);
  process.exit(2);
});
