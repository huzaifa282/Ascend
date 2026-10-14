/**
 * The single source of truth for every tunable constant in the rules engine
 * (spec section 5). Settings > "Ruleset tuning" stores overrides merged over
 * this object; nothing in the engine or UI hardcodes these numbers elsewhere.
 *
 * `docs/ruleset.md` is generated from this file by `pnpm gen:ruleset`.
 */
import type { Rank, StatCode } from './types';

export interface Ruleset {
  stats: {
    /** value(stat_xp) = floor(100 * (1 - exp(-stat_xp / statScale))), capped at 99. */
    statScale: number;
    /** A trained-but-idle stat shows the Idle tag after this many local days. */
    neglectDays: number;
    /** From day neglectDays+1, remove 1 value-point of stat XP per closed day. */
    neglectDecay: boolean;
  };
  activityXp: {
    /** xp_raw = round(min(duration_min, durationCapMinutes) * baseRate * intensity[x]). */
    baseRate: number;
    intensity: Record<'light' | 'moderate' | 'hard', number>;
    durationCapMinutes: number;
    /** Once a stat has this much stat XP today, further XP to it is scaled down. */
    statDailyCap: number;
    /** Multiplier applied to stat XP above the daily cap. */
    capFactorReduced: number;
  };
  penalty: {
    /** XP multiplier while in the Penalty Zone. */
    factor: number;
  };
  plausibilityFactor: {
    flagged: number;
    confirmed: number;
  };
  levels: {
    /** xp_needed(level) = roundToNearest(base + perLevel * level, roundTo). */
    base: number;
    perLevel: number;
    roundTo: number;
  };
  ranks: {
    /** Inclusive [low, high] level bands per rank, in ascending order. */
    bands: Record<Rank, [number, number]>;
    trialDays: number;
    trialDayXp: number;
    /** Level cap without passing the trial = band_start_of_next_rank + this. */
    levelCapOffset: number;
  };
  hp: {
    max: number;
    dailyLossCap: number;
    dailyUndoneLoss: number;
    allDoneGain: number;
    dangerThreshold: number;
    failedTaskBase: number;
    failedTaskPerDifficulty: number;
  };
  penaltyZone: {
    recoveryWindowHours: number;
    recoveryTasksNeeded: number;
    recoveryFocusMinutes: number;
    exitHp: number;
  };
  shields: {
    perMonth: number;
  };
  tasks: {
    base: Record<1 | 2 | 3 | 4 | 5, number>;
    estDefaultMinutes: Record<1 | 2 | 3 | 4 | 5, number>;
    ambitionBase: number;
    ambitionScale: number;
    pressureMin: number;
    pressureMax: number;
    highRiskAmbition: number;
    highRiskMinDifficulty: number;
    lowRewardAmbition: number;
    lowRewardMaxDifficulty: number;
    tiers: {
      earlyMinRemaining: number;
      earlyMultiplier: number;
      earlyScaledMinRemaining: number;
      earlyScaledBase: number;
      earlyScaledRange: number;
      onTimeMultiplier: number;
      graceWindowFraction: number;
      graceMinMinutes: number;
      graceMaxMinutes: number;
      lateMultiplier: number;
      lateWindowHours: number;
    };
    reschedule: {
      laterMultiplier: number;
      floorMultiplier: number;
    };
    emergency: {
      xp: number;
      hp: number;
      expireHours: number;
    };
    defaultStatWeights: Partial<Record<StatCode, number>>;
  };
  dailies: {
    xpBySize: Record<'small' | 'medium' | 'large' | 'xlarge', number>;
    streakMinXp: number;
  };
  timer: {
    presetsMinutes: number[];
    customMinMinutes: number;
    customMaxMinutes: number;
    breaksMinutes: number[];
    sessionsPerCycle: number;
    minCreditMinutes: number;
    pauseEndsSessionAfterMinutes: number;
    defaultStatWeights: Partial<Record<StatCode, number>>;
  };
  skills: {
    levelDivisor: number;
    suggestionCount: number;
    suggestionWindowDays: number;
    suggestionDismissDays: number;
  };
  plausibility: {
    running: { maxSpeedKmh: number; minSpeedKmh: number };
    walking: { maxSpeedKmh: number };
    cycling: { maxSpeedKmh: number };
    swimming: { maxSpeedKmh: number };
    maxSingleActivityHours: number;
    maxDailyTotalHours: number;
    reading: { maxPagesPerHour: number };
  };
  titles: {
    earlyRiserConsecutiveDays: number;
    earlyRiserCutoffHour: number;
    steadyHandTasks: number;
    ironWeekDays: number;
    nightOwlCutoffHour: number;
    /** Exclusive end of the "night owl" window (a log must land in [cutoff, windowEnd)). */
    nightOwlWindowEndHour: number;
    nightOwlDistinctDays: number;
    marathonMindHours: number;
    polymathSkillLevel: number;
    polymathDistinctStats: number;
  };
}

export const DEFAULT_RULESET: Ruleset = {
  stats: {
    statScale: 2000,
    neglectDays: 5,
    neglectDecay: true,
  },
  activityXp: {
    baseRate: 1.0,
    intensity: { light: 0.8, moderate: 1.0, hard: 1.3 },
    durationCapMinutes: 240,
    statDailyCap: 120,
    capFactorReduced: 0.25,
  },
  penalty: {
    factor: 0.5,
  },
  plausibilityFactor: {
    flagged: 0.2,
    confirmed: 1,
  },
  levels: {
    base: 100,
    perLevel: 126,
    roundTo: 50,
  },
  ranks: {
    bands: {
      E: [1, 9],
      D: [10, 24],
      C: [25, 39],
      B: [40, 59],
      A: [60, 79],
      S: [80, Number.POSITIVE_INFINITY],
    },
    trialDays: 7,
    trialDayXp: 90,
    levelCapOffset: 4,
  },
  hp: {
    max: 100,
    dailyLossCap: 20,
    dailyUndoneLoss: 4,
    allDoneGain: 5,
    dangerThreshold: 30,
    failedTaskBase: 2,
    failedTaskPerDifficulty: 2,
  },
  penaltyZone: {
    recoveryWindowHours: 24,
    recoveryTasksNeeded: 3,
    recoveryFocusMinutes: 60,
    exitHp: 30,
  },
  shields: {
    perMonth: 2,
  },
  tasks: {
    base: { 1: 20, 2: 40, 3: 70, 4: 110, 5: 160 },
    estDefaultMinutes: { 1: 15, 2: 30, 3: 60, 4: 120, 5: 240 },
    ambitionBase: 0.8,
    ambitionScale: 0.7,
    pressureMin: 0.02,
    pressureMax: 1,
    highRiskAmbition: 1.3,
    highRiskMinDifficulty: 4,
    lowRewardAmbition: 0.95,
    lowRewardMaxDifficulty: 2,
    tiers: {
      earlyMinRemaining: 0.5,
      earlyMultiplier: 1.25,
      earlyScaledMinRemaining: 0.1,
      earlyScaledBase: 1.1,
      earlyScaledRange: 0.15,
      onTimeMultiplier: 1.1,
      graceWindowFraction: 0.25,
      graceMinMinutes: 15,
      graceMaxMinutes: 120,
      lateMultiplier: 0.3,
      lateWindowHours: 24,
    },
    reschedule: {
      laterMultiplier: 0.95,
      floorMultiplier: 0.7,
    },
    emergency: {
      xp: 120,
      hp: 10,
      expireHours: 4,
    },
    defaultStatWeights: { DIS: 1 },
  },
  dailies: {
    xpBySize: { small: 20, medium: 40, large: 60, xlarge: 80 },
    streakMinXp: 30,
  },
  timer: {
    presetsMinutes: [25, 50, 90],
    customMinMinutes: 5,
    customMaxMinutes: 180,
    breaksMinutes: [5, 10, 15],
    sessionsPerCycle: 4,
    minCreditMinutes: 10,
    pauseEndsSessionAfterMinutes: 10,
    defaultStatWeights: { FOC: 0.7, DIS: 0.3 },
  },
  skills: {
    levelDivisor: 50,
    suggestionCount: 5,
    suggestionWindowDays: 21,
    suggestionDismissDays: 60,
  },
  plausibility: {
    running: { maxSpeedKmh: 25, minSpeedKmh: 3 },
    walking: { maxSpeedKmh: 8 },
    cycling: { maxSpeedKmh: 60 },
    swimming: { maxSpeedKmh: 6 },
    maxSingleActivityHours: 8,
    maxDailyTotalHours: 16,
    reading: { maxPagesPerHour: 150 },
  },
  titles: {
    earlyRiserConsecutiveDays: 7,
    earlyRiserCutoffHour: 8,
    steadyHandTasks: 20,
    ironWeekDays: 7,
    nightOwlCutoffHour: 1,
    nightOwlWindowEndHour: 5,
    nightOwlDistinctDays: 5,
    marathonMindHours: 300,
    polymathSkillLevel: 5,
    polymathDistinctStats: 4,
  },
};

/** Deep-merges partial ruleset overrides (from Settings) over the default. */
export function mergeRuleset(overrides: DeepPartial<Ruleset> | null | undefined): Ruleset {
  if (!overrides) return DEFAULT_RULESET;
  return deepMerge(DEFAULT_RULESET, overrides);
}

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Merges plain-object `overrides` onto `base`, one level at a time. Only
 * called (including recursively) once both sides are already confirmed
 * plain objects — see the ternary below, and `mergeRuleset`'s `Ruleset`
 * typing — so array and leaf values are replaced wholesale rather than
 * merged element-wise, and the recursion never has to fall back to a bare
 * value at the top.
 */
function deepMerge<T extends object>(base: T, overrides: DeepPartial<T>): T {
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(overrides)) {
    const overrideValue = (overrides as Record<string, unknown>)[key];
    const baseValue = (base as Record<string, unknown>)[key];
    result[key] = isPlainObject(baseValue) && isPlainObject(overrideValue)
      ? deepMerge(baseValue, overrideValue as DeepPartial<typeof baseValue>)
      : overrideValue;
  }
  return result as T;
}
