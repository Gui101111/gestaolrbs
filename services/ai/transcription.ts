import type { Transcript, TranscriptionProvider } from "../editing/types";

/**
 * Transcrição via servidor compatível com Whisper (ex.: faster-whisper / whisper.cpp server,
 * ou um serviço gerenciado) exposto em TRANSCRIPTION_URL.
 * Contrato esperado: POST { url, language, word_timestamps: true } → { language, duration, text, segments[{start,end,text,words[{word,start,end,probability}]}] }.
 */
export const whisperHttpProvider: TranscriptionProvider = {
  name: "whisper-http",
  async transcribe({ url, language = "pt" }) {
    const endpoint = process.env.TRANSCRIPTION_URL;
    if (!endpoint) throw new Error("transcription_not_configured");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TRANSCRIPTION_TOKEN ?? ""}` },
      body: JSON.stringify({ url, language, word_timestamps: true }),
      signal: AbortSignal.timeout(10 * 60_000),
    });
    if (!res.ok) throw new Error(`transcription_${res.status}`);
    const raw = (await res.json()) as {
      language: string;
      duration: number;
      text: string;
      segments: { start: number; end: number; text: string; words?: { word: string; start: number; end: number; probability?: number }[] }[];
    };
    const transcript: Transcript = {
      language: raw.language,
      durationSec: raw.duration,
      text: raw.text,
      segments: raw.segments.map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text.trim(),
        words: (s.words ?? []).map((w) => ({ text: w.word.trim(), start: w.start, end: w.end, confidence: w.probability })),
      })),
    };
    return transcript;
  },
};

export function getTranscriptionProvider(): TranscriptionProvider {
  return whisperHttpProvider;
}
