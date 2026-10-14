/**
 * Spec 6.5 — templated answers for `left_today` / `xp_today` / `next_deadline`
 * / `stat_status` questions. Pure string templates; the caller (an app
 * service with DB access) supplies the already-fetched numbers.
 */

export function answerLeftToday(openTaskTitles: string[], undoneDailyTitles: string[]): string {
  if (openTaskTitles.length === 0 && undoneDailyTitles.length === 0) {
    return "Nothing left today. Everything's done.";
  }
  const parts: string[] = [];
  if (undoneDailyTitles.length > 0) {
    parts.push(`${undoneDailyTitles.length} daily${undoneDailyTitles.length === 1 ? '' : 's'} (${undoneDailyTitles.join(', ')})`);
  }
  if (openTaskTitles.length > 0) {
    parts.push(`${openTaskTitles.length} task${openTaskTitles.length === 1 ? '' : 's'} (${openTaskTitles.join(', ')})`);
  }
  return `Left today: ${parts.join(' and ')}.`;
}

export function answerXpToday(xpToday: number): string {
  return `${xpToday} XP so far today.`;
}

export function answerNextDeadline(nextTaskTitle: string | null, dueLocal: string | null): string {
  if (!nextTaskTitle || !dueLocal) return 'No upcoming deadlines.';
  return `Next deadline: "${nextTaskTitle}", due ${dueLocal}.`;
}

export function answerStatStatus(statName: string, value: number, todayGain: number): string {
  const gainPart = todayGain > 0 ? `, up ${todayGain} today` : '';
  return `${statName} is at ${value}${gainPart}.`;
}
