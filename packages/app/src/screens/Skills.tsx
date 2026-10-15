import { useNavigate } from 'react-router-dom';
import { Button } from '@ascendant/ui';
import { DEFAULT_RULESET, STAT_CODES, type StatCode } from '@ascendant/engine';
import {
  useApproveSkillSuggestion,
  useDismissSkillSuggestion,
  useOpenSkillSuggestions,
  useSkillsList,
  useStats,
} from '../hooks';
import type { SkillRow } from '@ascendant/db';

function xpForLevel(level: number): number {
  return DEFAULT_RULESET.skills.levelDivisor * (level - 1) ** 2;
}

function skillProgress(skill: SkillRow) {
  const xpAtLevel = xpForLevel(skill.level);
  const xpAtNext = xpForLevel(skill.level + 1);
  const xpIntoLevel = skill.xp - xpAtLevel;
  const xpNeeded = Math.max(1, xpAtNext - xpAtLevel);
  return { xpIntoLevel, xpNeeded, pct: Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) };
}

/** Skills — spec 10.11. Grouped under the stat(s) they feed. */
export function Skills() {
  const navigate = useNavigate();
  const { data: skills } = useSkillsList();
  const { data: suggestions } = useOpenSkillSuggestions();
  const { data: stats } = useStats();
  const approve = useApproveSkillSuggestion();
  const dismiss = useDismissSkillSuggestion();

  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6 flex flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/status')}
        className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted self-start hover:text-text"
      >
        &larr; Back to Status
      </button>
      <h1 className="font-display text-[22px] font-bold a-heading">Skills</h1>

      {(suggestions ?? []).map((s) => (
        <div key={s.id} className="rounded-lg border border-accent bg-surface p-4 flex items-center justify-between gap-4">
          <div>
            <span className="font-display text-[15px] font-semibold">{s.name}</span>
            <p className="font-mono text-[11px] text-text-muted">
              Logged {s.evidenceCount} times — want to track it as a skill?
            </p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <Button variant="default" onClick={() => dismiss.mutate(s.id)}>
              DISMISS
            </Button>
            <Button variant="primary" onClick={() => approve.mutate(s.id)}>
              APPROVE
            </Button>
          </div>
        </div>
      ))}

      {STAT_CODES.map((code: StatCode) => {
        const statName = stats?.find((s) => s.code === code)?.name ?? code;
        const skillsForStat = (skills ?? []).filter((s) => (s.statCodes as StatCode[]).includes(code));
        if (skillsForStat.length === 0) return null;
        return (
          <section key={code} className="flex flex-col gap-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">{statName}</h2>
            <div className="rounded-lg border border-rule bg-bg a-card-clip">
              {skillsForStat.map((skill) => {
                const progress = skillProgress(skill);
                return (
                  <div key={skill.id} className="flex items-center gap-3 px-4 py-3 a-row">
                    <span className="font-mono text-[11px] text-text-muted w-8">Lv{skill.level}</span>
                    <span className="font-display text-[14px] flex-1 truncate">{skill.name}</span>
                    <div className="w-32 h-1.5 rounded-pill bg-surface overflow-hidden flex-none">
                      <div className="h-full bg-text rounded-pill" style={{ width: `${progress.pct}%` }} />
                    </div>
                    <span className="font-mono text-[11px] text-text-muted w-10 text-right flex-none">{progress.pct}%</span>
                    <span className="font-mono text-[11px] text-text-muted w-16 text-right flex-none">
                      {Math.round(skill.minutes / 60)}h
                    </span>
                    <span className="font-mono text-[10.5px] text-text-muted w-24 text-right flex-none">
                      {skill.lastTrainedAt ? new Date(skill.lastTrainedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {(!skills || skills.length === 0) && (suggestions ?? []).length === 0 && (
        <p className="text-text-muted">No skills yet. They get suggested once an activity label repeats enough.</p>
      )}
    </div>
  );
}
