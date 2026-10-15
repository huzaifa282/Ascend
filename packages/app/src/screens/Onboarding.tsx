import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Checkbox, StatFader } from '@ascendant/ui';
import { DEFAULT_RULESET, statValue, STAT_CODES } from '@ascendant/engine';
import { ModelPanel } from './settings/ModelPanel';
import { useOnboarding } from '../hooks/useOnboarding';
import { ONBOARDING_QUESTIONS, STAT_NAMES, baselineStatXp } from '../onboarding/baselines';

const TOTAL_STEPS = 6;

const TONE_SAMPLES: Record<'strict' | 'neutral' | 'encouraging', string> = {
  strict: 'Deadline missed. HP -12. Do not repeat it.',
  neutral: 'Deadline missed. HP decreased by 12.',
  encouraging: 'That one slipped. HP is down 12, and you can win it back today.',
};

/** Onboarding — spec 10.1. Six steps, progress pips in the header. */
export function Onboarding() {
  const { step = '1' } = useParams<{ step: string }>();
  const navigate = useNavigate();
  const current = Math.min(TOTAL_STEPS, Math.max(1, Number(step) || 1));
  const onboarding = useOnboarding();

  const goTo = (n: number) => navigate(`/onboarding/${n}`);

  useEffect(() => {
    if (current === 6) onboarding.ensureDailiesSelected(onboarding.dailies.map((d) => d.title));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the step changes
  }, [current]);

  const previewXp = baselineStatXp(onboarding.state.answers);

  const handleAwaken = async () => {
    await onboarding.finish();
    navigate('/today');
  };

  return (
    <div className="h-screen w-screen bg-bg text-text flex flex-col items-center overflow-y-auto py-10">
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-pill ${i + 1 === current ? 'bg-accent' : i + 1 < current ? 'bg-text' : 'bg-rule'}`}
          />
        ))}
      </div>

      <div className="w-full max-w-[560px] px-6 flex flex-col gap-6">
        {current === 1 && (
          <div className="flex flex-col gap-4 text-center items-center">
            <h1 className="font-display text-[28px] font-bold a-heading">Tell it what you did. It keeps score.</h1>
            <p className="text-text-muted">
              Ascendant turns your real activities — workouts, deep work, sleep, creative time — into stats, levels
              and quests. Everything stays on this device unless you choose to share it.
            </p>
            <Button variant="primary" onClick={() => goTo(2)}>
              BEGIN
            </Button>
          </div>
        )}

        {current === 2 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-[22px] font-bold a-heading text-center">A few questions</h1>
            {ONBOARDING_QUESTIONS.map((q) => (
              <div key={q.id} className="flex flex-col gap-2">
                <span className="font-display text-[15px]">{q.prompt}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {q.options.map((opt, i) => (
                    <Button
                      key={opt.label}
                      variant={onboarding.state.answers[q.id] === i ? 'primary' : 'default'}
                      onClick={() => onboarding.setAnswer(q.id, i)}
                    >
                      {opt.label.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-start justify-between gap-1 pt-2">
              {STAT_CODES.map((code) => (
                <StatFader key={code} code={code} name={STAT_NAMES[code].name} value={statValue(previewXp[code] ?? 0, DEFAULT_RULESET)} dense />
              ))}
            </div>
            <Button
              variant="primary"
              onClick={async () => {
                await onboarding.commitBaselines();
                goTo(3);
              }}
            >
              CONTINUE
            </Button>
          </div>
        )}

        {current === 3 && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-[22px] font-bold a-heading text-center">How should it talk to you?</h1>
            {(['strict', 'neutral', 'encouraging'] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => onboarding.setTone(tone)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  onboarding.state.tone === tone ? 'border-accent bg-surface' : 'border-rule'
                }`}
              >
                <span className="font-display text-[15px] font-semibold capitalize">{tone}</span>
                <p className="font-mono text-[12px] text-text-muted mt-1">{TONE_SAMPLES[tone]}</p>
              </button>
            ))}
            <Button variant="primary" onClick={() => goTo(4)}>
              CONTINUE
            </Button>
          </div>
        )}

        {current === 4 && (
          <div className="flex flex-col gap-4">
            <ModelPanel />
            <div className="flex items-center justify-between">
              <Button variant="default" onClick={() => goTo(5)}>
                SKIP. USE MANUAL MODE.
              </Button>
              <Button variant="primary" onClick={() => goTo(5)}>
                CONTINUE
              </Button>
            </div>
          </div>
        )}

        {current === 5 && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-[22px] font-bold a-heading text-center">Privacy</h1>
            <ul className="flex flex-col gap-3 font-display text-[14px]">
              <li>Everything is stored locally and in your OS keychain.</li>
              <li>Only the text you log goes to your chosen model provider, if you connect one.</li>
              <li>Sharing anything beyond this device is off by default and always opt-in.</li>
            </ul>
            <Button variant="primary" onClick={() => goTo(6)}>
              UNDERSTOOD
            </Button>
          </div>
        )}

        {current === 6 && (
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-[22px] font-bold a-heading text-center">Your first dailies</h1>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Your name</span>
              <input
                value={onboarding.state.name}
                onChange={(e) => onboarding.setName(e.target.value)}
                placeholder="What should it call you?"
                className="h-touch rounded-md border border-rule bg-surface px-3 font-display text-[14px]"
              />
            </label>
            <div className="rounded-lg border border-rule bg-bg a-card-clip">
              {onboarding.dailies.map((d) => (
                <label key={d.title} className="flex items-center gap-3 px-4 py-3 a-row cursor-pointer">
                  <Checkbox
                    checked={onboarding.state.selectedDailies.has(d.title)}
                    onChange={() => onboarding.toggleDaily(d.title)}
                    aria-label={d.title}
                  />
                  <span className="font-display text-[14px] flex-1">{d.title}</span>
                  <span className="font-mono text-[11px] text-accent">+{d.xp} XP</span>
                </label>
              ))}
            </div>
            <Button variant="primary" onClick={handleAwaken} disabled={onboarding.submitting}>
              {onboarding.submitting ? 'AWAKENING…' : 'AWAKEN'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
