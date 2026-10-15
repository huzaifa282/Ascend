import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Segmented } from '@ascendant/ui';
import type { StatCode } from '@ascendant/engine';
import { useStatDetail } from '../hooks/useStatDetail';
import { useStats } from '../hooks/useStats';

const RANGES = [
  { value: '30', label: '30 DAYS' },
  { value: '90', label: '90 DAYS' },
  { value: '365', label: '365 DAYS' },
] as const;

function LineChart({ series }: { series: { date: string; value: number }[] }) {
  const w = 560;
  const h = 220;
  const pad = 24;
  const points = series.map((p, i) => {
    const x = pad + (i / Math.max(1, series.length - 1)) * (w - pad * 2);
    const y = pad + (1 - p.value / 100) * (h - pad * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Value over time">
      {[0, 25, 50, 75, 100].map((v) => {
        const y = pad + (1 - v / 100) * (h - pad * 2);
        return (
          <g key={v}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="var(--rule)" strokeWidth={1} />
            <text x={4} y={y + 3} className="font-mono" fontSize={9} fill="var(--text-muted)">
              {v}
            </text>
          </g>
        );
      })}
      <polyline points={points.join(' ')} fill="none" stroke="var(--accent)" strokeWidth={2} />
    </svg>
  );
}

/** Stat detail — spec 10.10. */
export function StatDetail() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<'30' | '90' | '365'>('30');
  const { data: stats } = useStats();
  const { data: detail } = useStatDetail(code as StatCode, Number(range) as 30 | 90 | 365);

  const statRow = stats?.find((s) => s.code === code);

  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6 flex flex-col gap-6">
      <button type="button" onClick={() => navigate('/status')} className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted self-start hover:text-text">
        &larr; Back to Status
      </button>

      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">{code}</span>
          <h1 className="font-display text-[22px] font-bold a-heading">{statRow?.name ?? code}</h1>
        </div>
        <Segmented aria-label="Range" value={range} onChange={setRange} options={[...RANGES]} />
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-10 items-start">
        <div className="flex flex-col gap-2">
          <span className="font-display font-extrabold a-numeral text-[140px] leading-none">{detail?.value ?? 0}</span>
          <span className="font-mono text-[11px] text-text-muted">Today +{detail?.todayGain ?? 0}</span>
          <span className="font-mono text-[11px] text-text-muted">
            {range}-day change: {(detail?.changeOverRange ?? 0) >= 0 ? '+' : ''}
            {detail?.changeOverRange ?? 0}
          </span>
        </div>
        {detail && <LineChart series={detail.series} />}
      </div>

      {detail && detail.daysSinceTrained != null && detail.daysSinceTrained >= 5 && (
        <div className="rounded-lg border border-rule bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
          Idle {detail.daysSinceTrained} days — log a session.
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">Top contributors</h2>
        <div className="flex flex-col gap-2">
          {(detail?.contributors ?? []).map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <span className="font-display text-[13px] w-40 truncate">{c.label}</span>
              <div className="flex-1 h-2 rounded-pill bg-surface overflow-hidden">
                <div className="h-full bg-text rounded-pill" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="font-mono text-[11px] text-text-muted w-10 text-right">{c.pct}%</span>
            </div>
          ))}
          {detail && detail.contributors.length === 0 && <p className="text-text-muted">Nothing logged yet in this range.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">Recent entries</h2>
        <div className="rounded-lg border border-rule bg-bg a-card-clip">
          {(detail?.recent ?? []).map((e, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 a-row">
              <span className="font-mono text-[11px] text-text-muted">
                {new Date(e.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="font-display text-[14px] flex-1 px-3 truncate">{e.label}</span>
              <span className="font-mono text-[12px] text-accent tabular-nums">+{e.statXp}</span>
            </div>
          ))}
          {detail && detail.recent.length === 0 && <p className="text-text-muted p-4">Nothing yet.</p>}
        </div>
      </section>
    </div>
  );
}
