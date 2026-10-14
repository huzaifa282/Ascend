/** Shared types for the rules engine (spec section 4 and 5). Pure data, no I/O. */

export const STAT_CODES = [
  'STR',
  'END',
  'AGI',
  'VIT',
  'INT',
  'FOC',
  'CRE',
  'CHA',
  'DIS',
] as const;
export type StatCode = (typeof STAT_CODES)[number];

export const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type Rank = (typeof RANKS)[number];

export type Intensity = 'light' | 'moderate' | 'hard';

export type StatWeights = Partial<Record<StatCode, number>>;

/** Milliseconds since epoch (UTC). Always passed in — engine never reads the clock. */
export type EpochMs = number;

/** 'YYYY-MM-DD', the profile's local calendar day. */
export type LocalDate = string;
