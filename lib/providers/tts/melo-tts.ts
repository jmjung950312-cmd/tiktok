// lib/providers/tts/melo-tts.ts
// MeloTTS 프로바이더 — Phase 2 P2-T01 warm keep daemon 프로토콜.
// 기본 경로: scripts/melo_tts_daemon.py 를 싱글턴 spawn 하여 stdin JSON-L 프로토콜로 재사용.
// 폴백 경로: 환경변수 MELO_DAEMON=0 또는 daemon 3회 연속 실패 시 기존 one-shot 경로(scripts/melo_tts.py).
//
// 프로토콜(요청/응답)은 scripts/melo_tts_daemon.py 상단 docstring 참조.

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createInterface, type Interface as ReadlineInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';

import { readMediaDurationMs } from '../ffmpeg';
import type { SynthesizeInput, SynthesizeOutput, TtsProvider } from './types';

// ========== 경로 해석 ==========

function resolveMeloPython(): string {
  const fromEnv = process.env.MELO_PYTHON_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const projectVenv = path.resolve(process.cwd(), '.venv/bin/python');
  return projectVenv;
}

function resolveMeloDaemonScript(): string {
  const fromEnv = process.env.MELO_DAEMON_SCRIPT_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return path.resolve(process.cwd(), 'scripts/melo_tts_daemon.py');
}

function resolveMeloOneShotScript(): string {
  const fromEnv = process.env.MELO_SCRIPT_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return path.resolve(process.cwd(), 'scripts/melo_tts.py');
}

function isDaemonEnabled(): boolean {
  // MELO_DAEMON=0 이면 폴백, 그 외(미설정/"1"/기타)는 daemon 사용
  return process.env.MELO_DAEMON !== '0';
}

// ========== Daemon 요청/응답 타입 ==========

interface DaemonRequest {
  id: string;
  text?: string;
  speaker?: number;
  speed?: number;
  out?: string;
  cmd?: 'ping' | 'shutdown';
}

interface DaemonResponseBase {
  id: string;
  ok: boolean;
  error?: string;
}

interface DaemonSynthesizeResponse extends DaemonResponseBase {
  out?: string;
}

interface DaemonBootResponse extends DaemonResponseBase {
  ready?: boolean;
}

type DaemonResponse = DaemonSynthesizeResponse | DaemonBootResponse;

// ========== Daemon 싱글턴 상태 ==========

interface DaemonHandle {
  child: ChildProcessWithoutNullStreams;
  rl: ReadlineInterface;
  ready: Promise<void>;
  pending: Map<string, (res: DaemonResponse) => void>;
  failureCount: number;
}

let daemon: DaemonHandle | null = null;
let exitHooksInstalled = false;

function installExitHooksOnce(): void {
  if (exitHooksInstalled) return;
  exitHooksInstalled = true;
  const killDaemon = (): void => {
    if (daemon?.child && !daemon.child.killed) {
      try {
        daemon.child.kill('SIGTERM');
      } catch {
        // 이미 종료된 경우 무시
      }
    }
  };
  process.on('exit', killDaemon);
  process.on('SIGINT', () => {
    killDaemon();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    killDaemon();
    process.exit(143);
  });
}

function spawnDaemon(): DaemonHandle {
  const pythonBin = resolveMeloPython();
  const scriptPath = resolveMeloDaemonScript();

  if (!existsSync(pythonBin)) {
    throw new Error(
      `[melo-tts] Python 인터프리터를 찾을 수 없습니다: ${pythonBin}\n→ 'npm run setup:melo' 실행 필요`,
    );
  }
  if (!existsSync(scriptPath)) {
    throw new Error(`[melo-tts] daemon 스크립트를 찾을 수 없습니다: ${scriptPath}`);
  }

  // Unbuffered 출력 보장: PYTHONUNBUFFERED=1
  const child = spawn(pythonBin, ['-u', scriptPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  }) as ChildProcessWithoutNullStreams;

  const rl = createInterface({ input: child.stdout });
  const pending = new Map<string, (res: DaemonResponse) => void>();

  const handle: DaemonHandle = {
    child,
    rl,
    pending,
    failureCount: 0,
    ready: new Promise<void>((resolve, reject) => {
      // boot 응답을 받으면 ready
      const onBoot = (line: string): void => {
        try {
          const parsed = JSON.parse(line) as DaemonResponse;
          if (parsed.id === 'boot' && parsed.ok) {
            rl.off('line', onBoot);
            resolve();
          }
        } catch {
          // 파싱 실패한 라인은 무시하고 계속 대기
        }
      };
      rl.on('line', onBoot);

      // spawn 자체 실패 감지
      child.once('error', (err) => {
        reject(new Error(`[melo-tts] daemon spawn 실패: ${err.message}`));
      });
      child.once('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`[melo-tts] daemon 초기화 중 비정상 종료 (exit=${code})`));
        }
      });
    }),
  };

  // 공통 라인 reader: pending Map 조회 후 resolver 호출
  rl.on('line', (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let parsed: DaemonResponse;
    try {
      parsed = JSON.parse(trimmed) as DaemonResponse;
    } catch {
      // 디버깅 로그만 출력
      process.stderr.write(`[melo-tts] daemon 응답 파싱 실패: ${trimmed}\n`);
      return;
    }
    if (parsed.id === 'boot') return; // boot 응답은 ready promise 쪽에서 처리
    const resolver = pending.get(parsed.id);
    if (resolver) {
      pending.delete(parsed.id);
      resolver(parsed);
    }
  });

  // stderr은 디버깅 로그로 pass-through
  child.stderr.on('data', (chunk: Buffer) => {
    process.stderr.write(chunk);
  });

  // daemon이 예기치 않게 종료되면 pending 요청 모두 reject 대용
  child.on('exit', (code) => {
    process.stderr.write(`[melo-tts] daemon 종료 (exit=${code})\n`);
    pending.forEach((resolve) => {
      resolve({ id: '', ok: false, error: `daemon 종료 (exit=${code})` });
    });
    pending.clear();
    if (daemon === handle) {
      daemon = null;
    }
  });

  return handle;
}

async function ensureDaemon(): Promise<DaemonHandle> {
  installExitHooksOnce();
  if (daemon && !daemon.child.killed) {
    await daemon.ready;
    return daemon;
  }
  daemon = spawnDaemon();
  await daemon.ready;
  return daemon;
}

function sendDaemonRequest(handle: DaemonHandle, req: DaemonRequest): Promise<DaemonResponse> {
  return new Promise<DaemonResponse>((resolve, reject) => {
    handle.pending.set(req.id, resolve);
    const line = JSON.stringify(req) + '\n';
    if (!handle.child.stdin.writable) {
      handle.pending.delete(req.id);
      reject(new Error('[melo-tts] daemon stdin 이미 닫힘'));
      return;
    }
    handle.child.stdin.write(line, 'utf-8', (err) => {
      if (err) {
        handle.pending.delete(req.id);
        reject(err);
      }
    });
  });
}

// ========== MeloTtsProvider ==========

const MAX_DAEMON_RETRIES = 3;

export class MeloTtsProvider implements TtsProvider {
  readonly name = 'melo';

  async synthesize(input: SynthesizeInput): Promise<SynthesizeOutput> {
    if (!isDaemonEnabled()) {
      return this.synthesizeOneShot(input);
    }

    // daemon 경로 + 최대 재시도
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_DAEMON_RETRIES; attempt += 1) {
      try {
        return await this.synthesizeViaDaemon(input);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        process.stderr.write(
          `[melo-tts] daemon 시도 ${attempt}/${MAX_DAEMON_RETRIES} 실패: ${lastError.message}\n`,
        );
        // daemon을 한 번 kill 하여 다음 시도에서 재spawn
        if (daemon?.child && !daemon.child.killed) {
          daemon.child.kill('SIGTERM');
        }
        daemon = null;
      }
    }

    // 최종 폴백: one-shot 경로로 1회 시도
    process.stderr.write('[melo-tts] daemon 3회 연속 실패 — one-shot 폴백\n');
    try {
      return await this.synthesizeOneShot(input);
    } catch (fallbackErr) {
      const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(
        `[melo-tts] daemon + one-shot 모두 실패. daemon: ${lastError?.message ?? 'unknown'} | one-shot: ${fbMsg}`,
      );
    }
  }

  private async synthesizeViaDaemon(input: SynthesizeInput): Promise<SynthesizeOutput> {
    const handle = await ensureDaemon();
    const reqId = randomUUID();
    const response = (await sendDaemonRequest(handle, {
      id: reqId,
      text: input.text,
      speaker: input.voiceId,
      speed: input.speed,
      out: input.outPath,
    })) as DaemonSynthesizeResponse;

    if (!response.ok) {
      throw new Error(`[melo-tts] daemon 합성 실패: ${response.error ?? 'unknown'}`);
    }
    const audioPath = path.resolve(response.out ?? input.outPath);
    if (!existsSync(audioPath)) {
      throw new Error(`[melo-tts] daemon 출력 wav 없음: ${audioPath}`);
    }
    const durationMs = await readMediaDurationMs(audioPath);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error(`[melo-tts] 비정상 duration: ${durationMs}ms (${audioPath})`);
    }
    return { audioPath, durationMs };
  }

  private async synthesizeOneShot(input: SynthesizeInput): Promise<SynthesizeOutput> {
    const pythonBin = resolveMeloPython();
    const scriptPath = resolveMeloOneShotScript();

    if (!existsSync(pythonBin)) {
      throw new Error(
        `[melo-tts] Python 인터프리터를 찾을 수 없습니다: ${pythonBin}\n→ 'npm run setup:melo' 실행 필요`,
      );
    }
    if (!existsSync(scriptPath)) {
      throw new Error(`[melo-tts] melo_tts.py 스크립트를 찾을 수 없습니다: ${scriptPath}`);
    }

    const args = [
      scriptPath,
      '--text',
      input.text,
      '--speaker',
      String(input.voiceId),
      '--speed',
      String(input.speed),
      '--out',
      input.outPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(pythonBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf-8');
      });
      child.on('error', (err) => reject(new Error(`[melo-tts] spawn 실패: ${err.message}`)));
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`[melo-tts] exit=${code}\nstderr: ${stderr.slice(-1500)}`));
          return;
        }
        resolve();
      });
    });

    if (!existsSync(input.outPath)) {
      throw new Error(`[melo-tts] 출력 wav가 생성되지 않았습니다: ${input.outPath}`);
    }

    const durationMs = await readMediaDurationMs(input.outPath);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error(`[melo-tts] 비정상 duration: ${durationMs}ms (${input.outPath})`);
    }

    return {
      audioPath: path.resolve(input.outPath),
      durationMs,
    };
  }
}

// ========== 테스트 편의 함수 ==========

/** 테스트/종료 시 daemon을 명시적으로 정리한다. */
export async function shutdownMeloDaemonForTest(): Promise<void> {
  if (!daemon) return;
  try {
    await sendDaemonRequest(daemon, { id: randomUUID(), cmd: 'shutdown' });
  } catch {
    // 이미 죽었을 수 있음
  }
  if (daemon?.child && !daemon.child.killed) {
    daemon.child.kill('SIGTERM');
  }
  daemon = null;
}
