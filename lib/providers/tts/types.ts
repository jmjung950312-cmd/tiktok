// lib/providers/tts/types.ts
// TTS 프로바이더 공통 인터페이스. MeloTTS 외 ElevenLabs 등 Phase 2 대안 대비.

export interface SynthesizeInput {
  /** 합성할 한국어 문장 */
  text: string;
  /** 화자 ID (Phase 1은 MeloTTS KR 단일 화자, 0 고정) */
  voiceId: number;
  /** 낭독 속도 (0.8~1.3) */
  speed: number;
  /** 출력 wav 경로 */
  outPath: string;
}

export interface SynthesizeOutput {
  /** 생성된 wav 절대 경로 */
  audioPath: string;
  /** 실제 재생 길이(밀리초). ffprobe 기반 */
  durationMs: number;
}

export interface TtsProvider {
  readonly name: string;
  synthesize(input: SynthesizeInput): Promise<SynthesizeOutput>;
}
