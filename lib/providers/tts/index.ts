// lib/providers/tts/index.ts
// TTS 프로바이더 기본 export.
// Phase 2 P2-T01: MeloTtsProvider 내부에서 daemon(기본) / one-shot(MELO_DAEMON=0) 분기.
// 외부에서는 여전히 getTtsProvider()만 호출하면 됨.

import { MeloTtsProvider, shutdownMeloDaemonForTest } from './melo-tts';
import type { TtsProvider } from './types';

let singleton: TtsProvider | null = null;

export function getTtsProvider(): TtsProvider {
  if (singleton) return singleton;
  const name = process.env.TTS_PROVIDER ?? 'melo';
  switch (name) {
    case 'melo':
      singleton = new MeloTtsProvider();
      return singleton;
    default:
      throw new Error(`[tts] 지원하지 않는 TTS_PROVIDER: ${name}`);
  }
}

export type { TtsProvider, SynthesizeInput, SynthesizeOutput } from './types';
export { MeloTtsProvider, shutdownMeloDaemonForTest };
