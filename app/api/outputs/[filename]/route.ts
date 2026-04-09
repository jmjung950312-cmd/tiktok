// app/api/outputs/[filename]/route.ts
// mp4/wav/mp3 파일 스트리밍. `<video src>` 에서 직접 호출.
// 경로 traversal 방지: 파일명에 ../, 슬래시, 백슬래시, 널바이트 금지.
// 검색 범위: data/jobs/**/output/*.mp4

import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const OUTPUTS_ROOT = path.resolve(process.cwd(), 'data/jobs');
// P2-T05: 썸네일 jpg/png 허용 (composeVideo가 <stem>_thumb.jpg 생성)
const FILENAME_RE = /^[A-Za-z0-9._-]+\.(mp4|mov|webm|wav|mp3|m4a|jpg|jpeg|png)$/;
const ALLOWED_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

interface RouteContext {
  params: Promise<{ filename: string }>;
}

function findInOutputs(filename: string): string | null {
  // data/jobs/*/output/<filename>
  if (!existsSync(OUTPUTS_ROOT)) return null;
  const jobs = readdirSync(OUTPUTS_ROOT, { withFileTypes: true }).filter((e) => e.isDirectory());
  for (const job of jobs) {
    const candidate = path.join(OUTPUTS_ROOT, job.name, 'output', filename);
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      // 경로가 반드시 OUTPUTS_ROOT 하위인지 재검증 (심볼릭 링크 방어)
      const resolved = path.resolve(candidate);
      if (resolved.startsWith(OUTPUTS_ROOT + path.sep)) {
        return resolved;
      }
    }
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { filename: rawName } = await context.params;
  const filename = decodeURIComponent(rawName);

  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0') ||
    !FILENAME_RE.test(filename)
  ) {
    return new Response('bad-filename', { status: 400 });
  }

  const full = findInOutputs(filename);
  if (!full) {
    return new Response('not-found', { status: 404 });
  }

  const ext = path.extname(full).slice(1).toLowerCase();
  const mime = ALLOWED_EXT[ext] ?? 'application/octet-stream';
  const stat = statSync(full);

  const nodeStream = createReadStream(full);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(stat.size),
      'Cache-Control': 'private, max-age=0, no-store',
    },
  });
}
