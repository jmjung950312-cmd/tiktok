// lib/providers/ffmpeg.ts
// ffmpeg-static 바이너리 경로 관리 + spawn 래퍼.
// Phase 1 결정론 파이프라인(voice.ts/video.ts)에서 직접 사용.

import { spawn } from 'node:child_process';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';

/**
 * ffmpeg-static가 제공하는 정적 ffmpeg 바이너리 경로.
 * 타입 정의는 string | null. null이면 설치 누락이므로 즉시 throw.
 */
export function getFfmpegPath(): string {
  const p = (ffmpegStatic as unknown as string | null) ?? process.env.FFMPEG_PATH ?? null;
  if (!p) {
    throw new Error(
      '[ffmpeg] ffmpeg-static 바이너리 경로를 찾을 수 없습니다. npm install ffmpeg-static 확인 필요.',
    );
  }
  return p;
}

/**
 * ffmpeg 바이너리와 같은 디렉터리의 ffprobe 경로를 추정.
 * ffmpeg-static은 ffprobe를 제공하지 않으므로 보통은 동일 디렉터리에 없다.
 * 이 프로젝트는 voice.ts에서 ffmpeg `-i` + `-f null -` 조합으로 duration을 얻는
 * 대체 경로를 쓰므로 ffprobe 바이너리가 꼭 필요하지 않다.
 */
export function getFfprobePathOrNull(): string | null {
  try {
    const ffmpeg = getFfmpegPath();
    const guess = path.join(path.dirname(ffmpeg), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
    return guess;
  } catch {
    return null;
  }
}

export interface SpawnFfmpegOptions {
  /** true 면 stdout/stderr 를 문자열로 캡쳐해서 반환 */
  capture?: boolean;
  /** 타임아웃 (ms). 초과 시 SIGKILL */
  timeoutMs?: number;
}

export interface SpawnFfmpegResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * ffmpeg 바이너리를 args 로 실행한다. 종료 코드 0이 아니면 reject.
 * - timeoutMs 초과 시 SIGKILL + reject
 * - capture=true 이면 stdout/stderr 캡쳐 후 resolve
 */
export function spawnFfmpeg(
  args: string[],
  options: SpawnFfmpegOptions = {},
): Promise<SpawnFfmpegResult> {
  const ffmpeg = getFfmpegPath();
  const { capture = false, timeoutMs = 10 * 60 * 1000 } = options;

  return new Promise<SpawnFfmpegResult>((resolve, reject) => {
    const child = spawn(ffmpeg, args, {
      stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    if (capture && child.stdout) {
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf-8');
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf-8');
      });
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`[ffmpeg] 타임아웃 ${timeoutMs}ms 초과: ${args.join(' ')}`));
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`[ffmpeg] spawn 실패: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const exitCode = code ?? -1;
      if (exitCode !== 0) {
        reject(
          new Error(
            `[ffmpeg] 종료 코드 ${exitCode}\nargs: ${args.join(' ')}\nstderr: ${stderr.slice(-2000)}`,
          ),
        );
        return;
      }
      resolve({ exitCode, stdout, stderr });
    });
  });
}

/**
 * ffmpeg `-i <path>` 출력 로그에서 Duration 헤더를 추출하여 ms 로 반환.
 * ffprobe 바이너리 없이 duration 을 얻는 우회 경로.
 */
export async function readMediaDurationMs(filePath: string): Promise<number> {
  const { stderr } = await spawnFfmpeg(['-hide_banner', '-i', filePath, '-f', 'null', '-'], {
    capture: true,
    timeoutMs: 60_000,
  }).catch((err: Error) => {
    // -f null 은 종종 "Output #0, null" 으로 정상 종료하지만, 입력만으로 끝낼 경우
    // exitCode 0 이 아닐 수 있음. stderr 만 쓸 것이므로 에러 메시지에서 복구한다.
    const msg = err.message;
    return { exitCode: -1, stdout: '', stderr: msg };
  });

  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`[ffmpeg] Duration 파싱 실패: ${filePath}`);
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3]);
  return Math.round((h * 3600 + m * 60 + s) * 1000);
}
