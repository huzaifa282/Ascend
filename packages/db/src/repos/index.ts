import { createActivitiesRepo } from './activities';
import { createDailiesRepo, createDailyCompletionsRepo } from './dailies';
import { createEntriesRepo, createEntryItemsRepo } from './entries';
import { createEventsRepo } from './events';
import { createMainQuestsRepo } from './quests';
import { createMusicTracksRepo } from './music';
import { createProfileRepo } from './profile';
import { createRankTrialsRepo } from './rankTrials';
import { createSettingsRepo } from './settings';
import { createShareQueueRepo } from './share';
import { createShieldsRepo } from './shields';
import { createSkillSuggestionsRepo, createSkillsRepo } from './skills';
import { createStatsRepo } from './stats';
import { createChatMessagesRepo, createSystemMessagesRepo } from './system';
import { createTasksRepo } from './tasks';
import { createTimerSessionsRepo } from './timer';
import { createTitlesRepo } from './titles';
import type { Db } from './types';

export * from './profile';
export * from './settings';
export * from './stats';
export * from './entries';
export * from './activities';
export * from './tasks';
export * from './dailies';
export * from './quests';
export * from './skills';
export * from './titles';
export * from './rankTrials';
export * from './timer';
export * from './shields';
export * from './events';
export * from './system';
export * from './music';
export * from './share';

/** One factory wiring every repo to the same `Db` — what services actually import. */
export function createRepos(db: Db) {
  return {
    profile: createProfileRepo(db),
    settings: createSettingsRepo(db),
    stats: createStatsRepo(db),
    entries: createEntriesRepo(db),
    entryItems: createEntryItemsRepo(db),
    activities: createActivitiesRepo(db),
    tasks: createTasksRepo(db),
    dailies: createDailiesRepo(db),
    dailyCompletions: createDailyCompletionsRepo(db),
    mainQuests: createMainQuestsRepo(db),
    skills: createSkillsRepo(db),
    skillSuggestions: createSkillSuggestionsRepo(db),
    titles: createTitlesRepo(db),
    rankTrials: createRankTrialsRepo(db),
    timerSessions: createTimerSessionsRepo(db),
    shields: createShieldsRepo(db),
    events: createEventsRepo(db),
    systemMessages: createSystemMessagesRepo(db),
    chatMessages: createChatMessagesRepo(db),
    musicTracks: createMusicTracksRepo(db),
    shareQueue: createShareQueueRepo(db),
  };
}

export type Repos = ReturnType<typeof createRepos>;
