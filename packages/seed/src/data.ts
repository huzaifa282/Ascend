/** Static demo data for the seed generator — spec section 14. */
import type { StatCode, TitleKey } from '@ascendant/engine';

export const STAT_NAMES: Record<StatCode, { name: string; description: string; sort: number }> = {
  STR: { name: 'Strength', description: 'Lifting, calisthenics, manual work.', sort: 0 },
  END: { name: 'Endurance', description: 'Running, cycling, swimming, long walks.', sort: 1 },
  AGI: { name: 'Agility', description: 'Stretching, yoga, sports, dance.', sort: 2 },
  VIT: { name: 'Vitality', description: 'Sleep, nutrition, hydration, rest, health habits.', sort: 3 },
  INT: { name: 'Intellect', description: 'Study, reading, coding, courses.', sort: 4 },
  FOC: { name: 'Focus', description: 'Deep work, focus sessions, meditation.', sort: 5 },
  CRE: { name: 'Creativity', description: 'Music, art, writing, design.', sort: 6 },
  CHA: { name: 'Charisma', description: 'Calls, meetings, networking, presenting, social time.', sort: 7 },
  DIS: { name: 'Discipline', description: 'Planning, chores, keeping promises, deadlines met.', sort: 8 },
};

export interface DailyDef {
  title: string;
  statWeights: Partial<Record<StatCode, number>>;
  xp: number;
}

export const DEMO_DAILIES: DailyDef[] = [
  { title: 'Read 20 pages', statWeights: { INT: 1 }, xp: 40 },
  { title: 'Train 30 minutes', statWeights: { END: 1 }, xp: 60 },
  { title: 'Deep work 90 minutes', statWeights: { FOC: 1 }, xp: 80 },
  { title: 'Plan tomorrow before 22:00', statWeights: { DIS: 1 }, xp: 20 },
  { title: 'In bed before 23:30', statWeights: { VIT: 1 }, xp: 30 },
];

export interface SkillDef {
  name: string;
  statCodes: StatCode[];
}

export const DEMO_SKILLS: SkillDef[] = [
  { name: 'TypeScript', statCodes: ['INT'] },
  { name: 'Reading', statCodes: ['INT'] },
  { name: 'Deep work', statCodes: ['FOC'] },
  { name: 'Running', statCodes: ['END'] },
  { name: 'Guitar', statCodes: ['CRE'] },
  { name: 'UI design', statCodes: ['CRE'] },
];

export interface ActivityTemplateDef {
  title: string;
  activityClass: string;
  skillName: string | null;
  statWeights: Partial<Record<StatCode, number>>;
  durationRange: [number, number];
  intensities: Array<'light' | 'moderate' | 'hard'>;
  distanceRange?: [number, number];
  weekendOnly?: boolean;
}

export const ACTIVITY_TEMPLATES: ActivityTemplateDef[] = [
  {
    title: 'Morning run',
    activityClass: 'running',
    skillName: 'Running',
    statWeights: { END: 1 },
    durationRange: [25, 55],
    intensities: ['moderate', 'hard'],
    distanceRange: [5, 8],
  },
  {
    title: 'Reading',
    activityClass: 'reading',
    skillName: 'Reading',
    statWeights: { INT: 1 },
    durationRange: [20, 45],
    intensities: ['light'],
  },
  {
    title: 'Deep work block',
    activityClass: 'deep work',
    skillName: 'Deep work',
    statWeights: { FOC: 0.7, DIS: 0.3 },
    durationRange: [50, 100],
    intensities: ['moderate', 'hard'],
  },
  {
    title: 'Guitar practice',
    activityClass: 'music practice',
    skillName: 'Guitar',
    statWeights: { CRE: 1 },
    durationRange: [20, 40],
    intensities: ['light', 'moderate'],
  },
  {
    title: 'UI design work',
    activityClass: 'design',
    skillName: 'UI design',
    statWeights: { CRE: 0.6, FOC: 0.4 },
    durationRange: [40, 90],
    intensities: ['moderate'],
  },
  {
    title: 'TypeScript practice',
    activityClass: 'coding',
    skillName: 'TypeScript',
    statWeights: { INT: 0.8, DIS: 0.2 },
    durationRange: [30, 75],
    intensities: ['moderate', 'hard'],
  },
  {
    title: 'Call with a friend',
    activityClass: 'call',
    skillName: null,
    statWeights: { CHA: 1 },
    durationRange: [15, 35],
    intensities: ['light'],
  },
  {
    title: 'Light stretching',
    activityClass: 'stretching',
    skillName: null,
    statWeights: { AGI: 1 },
    durationRange: [10, 20],
    intensities: ['light'],
    weekendOnly: true,
  },
];

export interface TitleSeedDef {
  key: TitleKey;
  name: string;
  description: string;
  rule: Record<string, unknown>;
}

/** The eight shipped titles (spec 5.10). */
export const DEMO_TITLES: TitleSeedDef[] = [
  { key: 'first_light', name: 'First Light', description: 'Your first confirmed log.', rule: { kind: 'first_confirmed_log' } },
  {
    key: 'early_riser',
    name: 'Early Riser',
    description: 'A log before 08:00 on 7 consecutive days.',
    rule: { kind: 'consecutive_early_logs', days: 7, cutoffHour: 8 },
  },
  {
    key: 'steady_hand',
    name: 'Steady Hand',
    description: '20 tasks finished on time or early.',
    rule: { kind: 'tasks_on_time_or_early', count: 20 },
  },
  {
    key: 'iron_week',
    name: 'Iron Week',
    description: 'All dailies done 7 days in a row.',
    rule: { kind: 'consecutive_all_dailies_done', days: 7 },
  },
  {
    key: 'night_owl',
    name: 'Night Owl',
    description: 'Logs after 01:00 on 5 different days.',
    rule: { kind: 'distinct_late_log_days', count: 5, cutoffHour: 1 },
  },
  {
    key: 'marathon_mind',
    name: 'Marathon Mind',
    description: '300 focus hours total.',
    rule: { kind: 'total_focus_hours', hours: 300 },
  },
  {
    key: 'polymath',
    name: 'Polymath',
    description: 'Skill level 5 in skills under 4 different stats.',
    rule: { kind: 'skill_level_under_n_stats', level: 5, stats: 4 },
  },
  { key: 'comeback', name: 'Comeback', description: 'Leave the Penalty Zone.', rule: { kind: 'left_penalty_zone' } },
];

export interface MusicTrackDef {
  title: string;
  artist: string;
  album: string | null;
  durationS: number;
}

/** Fictional demo tracks (spec 14) — never real artists or titles. */
export const DEMO_MUSIC_TRACKS: MusicTrackDef[] = [
  { title: 'Weightless Hours', artist: 'Lumen Field', album: 'Night Shift', durationS: 243 },
  { title: 'Low Tide Study', artist: 'Harbor & Pine', album: 'Night Shift', durationS: 198 },
  { title: 'Glass Corridor', artist: 'Mira Okon', album: null, durationS: 221 },
  { title: 'Paper Lanterns', artist: 'Mira Okon', album: null, durationS: 205 },
  { title: 'Signal Garden', artist: 'Teo Varga', album: null, durationS: 267 },
];
