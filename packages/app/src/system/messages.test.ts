import { describe, expect, it } from 'vitest';
import { renderMessage } from './messages';

describe('renderMessage', () => {
  it('matches the spec 6.8 worked examples exactly', () => {
    expect(renderMessage('stat_up', 'neutral', { stat: 'Focus', amount: 3 })).toBe('Focus increased by 3.');
    expect(renderMessage('stat_up', 'strict', { stat: 'Focus', amount: 3 })).toBe('Focus +3.');
    expect(renderMessage('stat_up', 'encouraging', { stat: 'Focus', amount: 3 })).toBe('Focus is up 3. Nice work.');

    expect(renderMessage('quest_done', 'neutral', { title: 'Read 20 pages', xp: 40 })).toBe(
      'Quest complete: Read 20 pages. +40 XP.',
    );
    expect(renderMessage('quest_done', 'strict', { title: 'Read 20 pages', xp: 40 })).toBe('Quest complete. +40 XP.');
    expect(renderMessage('quest_done', 'encouraging', { title: 'Read 20 pages', xp: 40 })).toBe(
      'Read 20 pages, done. +40 XP.',
    );

    expect(renderMessage('deadline_missed', 'neutral', { hp: 8 })).toBe('Deadline missed. HP decreased by 8.');
    expect(renderMessage('deadline_missed', 'strict', { hp: 8 })).toBe('Deadline missed. HP -8. Do not repeat it.');
    expect(renderMessage('deadline_missed', 'encouraging', { hp: 8 })).toBe(
      "That one slipped. HP is down 8, and you can win it back today.",
    );

    expect(renderMessage('title_earned', 'neutral', { title: 'Early Riser' })).toBe('Title earned: Early Riser.');
    expect(renderMessage('level_up', 'neutral', { level: 24 })).toBe('Level 24 reached. HP restored.');
    expect(renderMessage('level_up', 'encouraging', { level: 24 })).toBe('Level 24! HP is full again.');
  });

  it('falls back to the raw key for an unknown template', () => {
    expect(renderMessage('not_a_real_key', 'neutral')).toBe('not_a_real_key');
  });

  it('has all three tones for every template key', () => {
    const tones = ['strict', 'neutral', 'encouraging'] as const;
    // Importing the map indirectly: every key renderMessage succeeds on, for every tone.
    for (const key of [
      'stat_up',
      'quest_done',
      'deadline_missed',
      'title_earned',
      'level_up',
      'rank_up',
      'rank_trial_unlocked',
      'penalty_zone_entered',
      'penalty_zone_exited',
      'hp_low',
    ]) {
      for (const tone of tones) {
        expect(renderMessage(key, tone, { stat: 'X', amount: 1, title: 'X', xp: 1, hp: 1, level: 1, rank: 'D' })).not.toBe(key);
      }
    }
  });
});
