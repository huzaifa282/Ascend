import { createServiceContext } from './context';
import type { AppearanceSettings } from '../settings/schema';

export type FeedbackSoundKind = 'confirm' | 'complete' | 'levelUp' | 'cleared';

// Short rising/falling note sequences, picked per kind — synthesized, so
// "musical feedback" needs no bundled audio asset and plays identically
// everywhere the app runs.
const PHRASES: Record<FeedbackSoundKind, number[]> = {
  // A quick, bright two-note "pop" for adding something new — distinct from
  // 'complete's fuller chime (finishing something) and deliberately short so
  // it reads as a light, memorable confirmation rather than a distraction.
  confirm: [880, 987.77],
  complete: [523.25, 659.25],
  levelUp: [523.25, 659.25, 783.99, 1046.5],
  cleared: [440, 554.37],
};

const DEFAULT_NOTE_LENGTH = 0.11;
const NOTE_LENGTHS: Partial<Record<FeedbackSoundKind, number>> = {
  confirm: 0.07,
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function playTone(ctx: AudioContext, freq: number, startAt: number, durationS: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationS);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationS + 0.02);
}

/**
 * Plays a short synthesized chime for a progression event (spec 10.9's
 * moments + toasts). Silent whenever Settings > Appearance has sound off,
 * and never throws — feedback sound is decoration, not something that
 * should take down an accept/complete flow if it fails.
 */
export async function playFeedbackSound(kind: FeedbackSoundKind): Promise<void> {
  try {
    const ctx = await createServiceContext();
    const row = await ctx.repos.settings.get();
    const appearance = row?.appearance as AppearanceSettings | undefined;
    if (appearance && !appearance.sound) return;

    const audio = getAudioContext();
    if (!audio) return;
    const noteLength = NOTE_LENGTHS[kind] ?? DEFAULT_NOTE_LENGTH;
    PHRASES[kind].forEach((freq, i) => playTone(audio, freq, audio.currentTime + i * noteLength, noteLength * 1.4));
  } catch {
    // Settings unreadable or Web Audio unavailable — stay silent rather than surface an error.
  }
}
