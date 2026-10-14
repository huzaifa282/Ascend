/**
 * Spec section 14 — a deterministic 60-day demo profile, built by running
 * real events through the real services (so every number is consistent
 * with the engine, exactly like a real user's history would be).
 */
import { createRepos, newId, type Db, type SqlExecutor } from '@ascendant/db';
import {
  DEFAULT_RULESET,
  STAT_CODES,
  type Difficulty,
  type StatCode,
} from '@ascendant/engine';
import {
  completeDaily,
  completeTask,
  dayClose,
  logActivity,
  useShield,
  addLocalDays,
  localDateString,
  localMidnightMs,
  DEFAULT_SETTINGS,
  type ServiceContext,
} from '@ascendant/app';
import {
  ACTIVITY_TEMPLATES,
  DEMO_DAILIES,
  DEMO_MUSIC_TRACKS,
  DEMO_SKILLS,
  DEMO_TITLES,
  STAT_NAMES,
} from './data';
import { createPrng, type Prng } from './prng';

export interface GenerateSeedOptions {
  /** Anchor instant; history ends the day before this, "today" starts fresh. Defaults to Date.now(). */
  now?: number;
  seed?: number;
  name?: string;
  timezone?: string;
}

export interface GenerateSeedResult {
  profileId: string;
  daysSimulated: number;
}

export async function buildSeedContext(db: Db, sql: SqlExecutor): Promise<ServiceContext> {
  return { db, sql, repos: createRepos(db), ruleset: DEFAULT_RULESET };
}

export async function generateSeed(ctx: ServiceContext, options: GenerateSeedOptions = {}): Promise<GenerateSeedResult> {
  const now = options.now ?? Date.now();
  const name = options.name ?? 'Alex';
  const timezone = options.timezone ?? 'Asia/Karachi';
  const rng = createPrng(options.seed ?? 20261014);

  const profileId = newId();
  const today = localDateString(now, timezone);
  const historyStart = addLocalDays(today, -60);

  await ctx.repos.profile.create({
    id: profileId,
    createdAt: localMidnightMs(historyStart, timezone),
    updatedAt: now,
    name,
    timezone,
    tone: 'neutral',
    levelingEnabled: true,
    level: 1,
    xpIntoLevel: 0,
    totalXp: 0,
    rank: 'E',
    hp: 100,
    equippedTitleId: null,
    streakDays: 0,
    streakFrozenUntil: null,
    penaltyZoneSince: null,
    onboardingDone: true,
    lastDayCloseDate: historyStart,
  });

  await ctx.repos.settings.create({
    id: newId(),
    createdAt: now,
    updatedAt: now,
    model: DEFAULT_SETTINGS.model,
    voice: DEFAULT_SETTINGS.voice,
    notifications: DEFAULT_SETTINGS.notifications,
    quietHours: DEFAULT_SETTINGS.quietHours,
    widget: DEFAULT_SETTINGS.widget,
    music: DEFAULT_SETTINGS.music,
    timer: DEFAULT_SETTINGS.timer,
    appearance: DEFAULT_SETTINGS.appearance,
    dataSharing: DEFAULT_SETTINGS.dataSharing,
    rulesetOverrides: null,
    hotkey: DEFAULT_SETTINGS.hotkey,
  });

  for (const code of STAT_CODES) {
    const def = STAT_NAMES[code];
    await ctx.repos.stats.create({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      code,
      name: def.name,
      sort: def.sort,
      hidden: false,
      statXp: 0,
      value: 0,
      lastTrainedAt: null,
    });
  }

  const dailyIds: string[] = [];
  for (const [i, def] of DEMO_DAILIES.entries()) {
    const id = newId();
    dailyIds.push(id);
    await ctx.repos.dailies.create({
      id,
      createdAt: now,
      updatedAt: now,
      title: def.title,
      statWeights: def.statWeights,
      xp: def.xp,
      recurrence: { type: 'daily' },
      active: true,
      sort: i,
    });
  }

  const skillIdByName = new Map<string, string>();
  for (const def of DEMO_SKILLS) {
    const id = newId();
    skillIdByName.set(def.name, id);
    await ctx.repos.skills.create({
      id,
      createdAt: now,
      updatedAt: now,
      name: def.name,
      statCodes: def.statCodes,
      xp: 0,
      level: 1,
      minutes: 0,
      lastTrainedAt: null,
    });
  }

  const titleIdByKey = new Map<string, string>();
  for (const def of DEMO_TITLES) {
    const id = newId();
    titleIdByKey.set(def.key, id);
    await ctx.repos.titles.create({
      id,
      createdAt: now,
      updatedAt: now,
      key: def.key,
      name: def.name,
      description: def.description,
      rule: def.rule,
      earnedAt: null,
    });
  }

  // Zero days and shield days all land in the first 40 days, so the trailing
  // ~20 days stay clean and build the streak the spec calls for.
  const zeroDayOffsets = new Set([6, 22, 37]);
  const shieldDayOffsets = new Set([11, 27]);
  // One deliberate miss 19 days back resets the streak so it lands at exactly 18.
  const streakResetOffset = 59 - 19;
  // A guaranteed perfect week so the E->D rank trial actually passes (spec:
  // the demo profile ends at rank D) rather than being left to chance.
  const perfectWeekOffsets = new Set([44, 45, 46, 47, 48, 49, 50]);

  for (let offset = 1; offset <= 60; offset++) {
    const date = addLocalDays(historyStart, offset);
    const dayStartMs = localMidnightMs(date, timezone);
    const isWeekend = new Date(dayStartMs).getUTCDay() % 6 === 0;
    const isZeroDay = zeroDayOffsets.has(offset) || offset === streakResetOffset;
    const isShieldDay = shieldDayOffsets.has(offset);
    const isCleanTail = offset > streakResetOffset;
    const isPerfectWeek = perfectWeekOffsets.has(offset);

    if (isShieldDay) {
      await useShield(ctx, dayStartMs + 9 * 60 * 60 * 1000);
    } else if (!isZeroDay) {
      await simulateNormalDay(ctx, rng, {
        date,
        dayStartMs,
        isWeekend,
        skillIdByName,
        light: isCleanTail && !isPerfectWeek,
        forceAllDailies: isPerfectWeek,
        dailyIds,
      });

      if (offset % 3 === 0) {
        await simulateOneTask(ctx, rng, dayStartMs, offset);
      }
    }

    // Close this day before moving on to the next (spec 5.4's "process all missed days in order").
    await dayClose(ctx, localMidnightMs(addLocalDays(date, 1), timezone) + 5 * 60 * 1000);
  }

  // One failed task, deliberately (spec 14: "one failed").
  await seedFailedTask(ctx, now, timezone);

  // Hand-earn the two titles the spec calls out for the demo (the automatic
  // per-event title-checking pipeline lands in phase 7).
  const firstLightId = titleIdByKey.get('first_light');
  const earlyRiserId = titleIdByKey.get('early_riser');
  if (firstLightId) await ctx.repos.titles.markEarned(firstLightId, localMidnightMs(addLocalDays(historyStart, 1), timezone));
  if (earlyRiserId) await ctx.repos.titles.markEarned(earlyRiserId, localMidnightMs(addLocalDays(historyStart, 10), timezone));

  await seedTodaysTasks(ctx, now, timezone);
  await seedMusic(ctx, now);
  await seedSkillSuggestion(ctx, now);

  return { profileId, daysSimulated: 60 };
}

interface NormalDayInput {
  date: string;
  dayStartMs: number;
  isWeekend: boolean;
  skillIdByName: Map<string, string>;
  /** The trailing ~19 clean days: lighter activity load, so no last-minute
   * level-up resets HP to max right before "today" (spec 5.3's restore-on-
   * level-up would otherwise mask the HP settling the demo profile wants). */
  light: boolean;
  forceAllDailies?: boolean;
  dailyIds: string[];
}

async function simulateNormalDay(ctx: ServiceContext, rng: Prng, input: NormalDayInput): Promise<void> {
  const base = input.isWeekend ? 2 : 6;
  const activityCount = input.light ? Math.max(1, rng.int(2) + 1) : base + rng.int(2);
  const pool = input.isWeekend ? ACTIVITY_TEMPLATES : ACTIVITY_TEMPLATES.filter((t) => !t.weekendOnly);
  const durationScale = input.light ? 0.6 : 2.3;

  for (let i = 0; i < activityCount; i++) {
    const template = rng.pick(pool);
    const durationMin = Math.round(rng.range(template.durationRange[0], template.durationRange[1]) * durationScale);
    const intensity = rng.pick(template.intensities);
    const startedAt = input.dayStartMs + Math.round(rng.range(7, 21) * 60 * 60 * 1000);
    const distanceKm = template.distanceRange ? Math.round(rng.range(...template.distanceRange) * 10) / 10 : null;

    await logActivity(ctx, {
      title: template.title,
      activityClass: template.activityClass,
      durationMin,
      intensity,
      distanceKm,
      pages: template.activityClass === 'reading' ? Math.round(durationMin * rng.range(1.5, 2.5)) : null,
      statWeights: template.statWeights,
      skillId: template.skillName ? input.skillIdByName.get(template.skillName) : null,
      startedAt,
      now: startedAt,
    });
  }

  for (const dailyId of input.dailyIds) {
    if (input.forceAllDailies || rng.chance(0.8)) {
      await completeDaily(ctx, dailyId, input.dayStartMs + Math.round(rng.range(8, 22) * 60 * 60 * 1000));
    }
  }
}

async function simulateOneTask(ctx: ServiceContext, rng: Prng, dayStartMs: number, offset: number): Promise<void> {
  const difficulty = (rng.int(3) + 2) as Difficulty;
  const windowStart = dayStartMs;
  const dueAt = dayStartMs + Math.round(rng.range(4, 20) * 60 * 60 * 1000);
  const taskId = newId();
  await ctx.repos.tasks.create({
    id: taskId,
    createdAt: windowStart,
    updatedAt: windowStart,
    title: `Demo task #${offset}`,
    notes: null,
    dueAt,
    windowStart,
    difficulty,
    estMinutes: null,
    statWeights: { DIS: 1 },
    reminderMinutes: null,
    status: 'open',
    completedAt: null,
    rewardTier: null,
    xpAwarded: null,
    rescheduleCount: 0,
    mainQuestId: null,
    emergency: false,
    expiresAt: null,
  });
  // Completed at a random point before the deadline — mostly early/on-time,
  // feeding the ~87% on-time rate the spec describes.
  const completedAt = rng.chance(0.87) ? dueAt - Math.round(rng.range(0, 4) * 60 * 60 * 1000) : dueAt + Math.round(rng.range(0, 2) * 60 * 60 * 1000);
  await completeTask(ctx, taskId, Math.min(completedAt, dueAt + 23 * 60 * 60 * 1000));
}

async function seedFailedTask(ctx: ServiceContext, now: number, timezone: string): Promise<void> {
  const dueAt = now - 48 * 60 * 60 * 1000;
  const taskId = newId();
  await ctx.repos.tasks.create({
    id: taskId,
    createdAt: dueAt - 6 * 60 * 60 * 1000,
    updatedAt: dueAt - 6 * 60 * 60 * 1000,
    title: 'Renew the design software license',
    notes: null,
    dueAt,
    windowStart: dueAt - 6 * 60 * 60 * 1000,
    difficulty: 2,
    estMinutes: 15,
    statWeights: { DIS: 1 },
    reminderMinutes: null,
    status: 'open',
    completedAt: null,
    rewardTier: null,
    xpAwarded: null,
    rescheduleCount: 0,
    mainQuestId: null,
    emergency: false,
    expiresAt: null,
  });
  await completeTask(ctx, taskId, now - 1000); // still open, well past due+24h -> fails
  void timezone;
}

async function seedTodaysTasks(ctx: ServiceContext, now: number, timezone: string): Promise<void> {
  const today = localDateString(now, timezone);
  const todayStart = localMidnightMs(today, timezone);

  const tasks: Array<{ title: string; dueAt: number; difficulty: Difficulty; windowStart: number }> = [
    { title: 'Pay the hosting invoice', dueAt: todayStart + 9 * 60 * 60 * 1000, difficulty: 2, windowStart: todayStart - 2 * 24 * 60 * 60 * 1000 },
    { title: 'Send revised proposal', dueAt: todayStart + 18 * 60 * 60 * 1000, difficulty: 3, windowStart: todayStart - 1 * 24 * 60 * 60 * 1000 },
    { title: 'Finish the lab report', dueAt: now - 3 * 60 * 60 * 1000, difficulty: 4, windowStart: todayStart - 3 * 24 * 60 * 60 * 1000 },
    { title: 'Call the dentist', dueAt: todayStart + 16 * 60 * 60 * 1000, difficulty: 1, windowStart: todayStart },
  ];

  for (const t of tasks) {
    await ctx.repos.tasks.create({
      id: newId(),
      createdAt: t.windowStart,
      updatedAt: t.windowStart,
      title: t.title,
      notes: t.title === 'Call the dentist' ? 'Ambiguous time example: "call the dentist at 7".' : null,
      dueAt: t.dueAt,
      windowStart: t.windowStart,
      difficulty: t.difficulty,
      estMinutes: null,
      statWeights: { DIS: 1 },
      reminderMinutes: [120, 30],
      status: 'open',
      completedAt: null,
      rewardTier: null,
      xpAwarded: null,
      rescheduleCount: 0,
      mainQuestId: null,
      emergency: false,
      expiresAt: null,
    });
  }
}

async function seedMusic(ctx: ServiceContext, now: number): Promise<void> {
  for (const track of DEMO_MUSIC_TRACKS) {
    await ctx.repos.musicTracks.upsertByPath({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      path: `demo://music/${track.title.replace(/\s+/g, '-').toLowerCase()}.mp3`,
      title: track.title,
      artist: track.artist,
      album: track.album,
      durationS: track.durationS,
      artPath: null,
      folder: 'demo',
    });
  }
}

async function seedSkillSuggestion(ctx: ServiceContext, now: number): Promise<void> {
  await ctx.repos.skillSuggestions.create({
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: 'Stretching',
    statCodes: ['AGI'] as StatCode[],
    evidenceCount: 5,
    status: 'open',
  });
}
