import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Dial, IconButton, LevelChip, PlayButton } from '@ascendant/ui';
import { xpNeeded, DEFAULT_RULESET } from '@ascendant/engine';
import { useMusicPlayerRemote, useProfile, useTimer, useWidgetSettings } from '../hooks';
import { assetUrl } from '../lib/assetUrl';

function openMain(route?: string): void {
  void invoke('open_main', { route });
}

/**
 * The compact strip (560x76, the only full pill) — spec 11.5. Playback
 * here is a remote control: the real `<audio>` element lives in the
 * (hidden, still-running) widget window — see useMusicPlayer's module doc.
 */
export function StripContent() {
  const { data: profile } = useProfile();
  const { data: widgetSettings } = useWidgetSettings();
  const { state: timer, start } = useTimer();
  const { state: track, playPause, next } = useMusicPlayerRemote();
  const timerIdle = timer.phase === 'idle';

  // Same desktop-anchoring as the widget (see WidgetContent.tsx) — default
  // is anchored to the desktop; "always on top" switches it to floating.
  useEffect(() => {
    void invoke('set_companion_anchor', { label: 'strip', anchor: !(widgetSettings?.alwaysOnTop ?? false) });
  }, [widgetSettings?.alwaysOnTop]);

  const elapsedMin = (timer.totalS - timer.leftS) / 60;
  const totalMin = timer.totalS / 60 || 25;

  return (
    <div
      data-tauri-drag-region="deep"
      className="h-screen w-screen flex items-center gap-3 px-3 bg-bg border border-rule rounded-pill overflow-hidden text-text cursor-move"
    >
      {profile && (
        <button type="button" onClick={() => openMain('/status')} className="flex-none">
          <LevelChip
            level={profile.level}
            rank={profile.rank}
            xpIntoLevel={profile.xpIntoLevel}
            xpNeeded={xpNeeded(profile.level, DEFAULT_RULESET)}
          />
        </button>
      )}

      {timerIdle ? (
        <IconButton icon="timer" aria-label="Start focus timer" onClick={() => void start('focus', 25)} />
      ) : (
        <button type="button" onClick={() => openMain('/focus')} className="flex flex-col items-center flex-none">
          <span className="font-mono text-[10px] uppercase tracking-[.1em] text-accent">
            {timer.kind === 'break' ? 'BREAK' : 'FOCUS'}
          </span>
          <Dial size={40} elapsedMin={elapsedMin} totalMin={totalMin} onBreak={timer.kind === 'break'} />
        </button>
      )}

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="w-10 h-10 rounded-md bg-surface overflow-hidden flex-none">
          {track.artPath && <img src={assetUrl(track.artPath)} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-display text-[12px] truncate">{track.title ?? 'Nothing playing'}</span>
          {track.artist && <span className="font-mono text-[10px] text-text-muted truncate">{track.artist}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-none">
        <PlayButton playing={track.playing} onClick={playPause} aria-label={track.playing ? 'Pause' : 'Play'} size="small" />
        <IconButton icon="next" aria-label="Next" onClick={next} />
        <IconButton icon="expand" aria-label="Expand" onClick={() => void invoke('toggle_companion_size')} />
        <IconButton icon="x" aria-label="Close" onClick={() => void getCurrentWindow().hide()} />
      </div>
    </div>
  );
}
