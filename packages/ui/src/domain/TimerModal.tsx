import type { ReactNode } from 'react';
import { Modal } from '../primitives/Modal';
import { Segmented } from '../primitives/Segmented';
import { Toggle } from '../primitives/Toggle';
import { RoundButton } from '../primitives/RoundButton';
import { Button } from '../primitives/Button';
import { Dial } from './Dial';

export interface TimerOption {
  id: string;
  label: string;
}

export interface TimerModalProps {
  open: boolean;
  onClose: () => void;
  elapsedMin: number;
  totalMin: number;
  onBreak: boolean;
  lengthPreset: '25' | '50' | '90' | 'custom';
  onLengthChange: (preset: '25' | '50' | '90' | 'custom') => void;
  breakPreset: '5' | '10' | '15';
  onBreakChange: (preset: '5' | '10' | '15') => void;
  workingOnOptions: TimerOption[];
  workingOnId: string | null;
  onWorkingOnChange: (id: string | null) => void;
  playMusicOnStart: boolean;
  onPlayMusicChange: (on: boolean) => void;
  soundAtEnd: boolean;
  onSoundAtEndChange: (on: boolean) => void;
  autoStartBreaks: boolean;
  onAutoStartBreaksChange: (on: boolean) => void;
  onStop: () => void;
  onPause: () => void;
  onAddFive: () => void;
  onFullScreen: () => void;
}

/** Dial(180) + stop/pause/+5; Length/Break/Working on/toggles; footer Full screen / Done (spec 9.2). */
export function TimerModal(props: TimerModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Focus timer"
      footer={
        <>
          <Button variant="default" onClick={props.onFullScreen}>
            FULL SCREEN
          </Button>
          <Button variant="primary" onClick={props.onClose}>
            DONE
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 mb-6">
        <Dial size={180} elapsedMin={props.elapsedMin} totalMin={props.totalMin} onBreak={props.onBreak} />
        <div className="flex items-center gap-2">
          <RoundButton icon="stop" aria-label="Stop" onClick={props.onStop} />
          <RoundButton icon="pause" aria-label="Pause" onClick={props.onPause} />
          <RoundButton icon="plus" aria-label="Add 5 minutes" onClick={props.onAddFive} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Row label="Length">
          <Segmented
            aria-label="Session length"
            value={props.lengthPreset}
            onChange={props.onLengthChange}
            options={[
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '90', label: '90' },
              { value: 'custom', label: 'CUSTOM' },
            ]}
          />
        </Row>
        <Row label="Break">
          <Segmented
            aria-label="Break length"
            value={props.breakPreset}
            onChange={props.onBreakChange}
            options={[
              { value: '5', label: '5' },
              { value: '10', label: '10' },
              { value: '15', label: '15' },
            ]}
          />
        </Row>
        <Row label="Working on">
          <select
            className="h-touch rounded-md border border-rule bg-surface px-2 font-display text-[14px] max-w-[220px]"
            value={props.workingOnId ?? ''}
            onChange={(e) => props.onWorkingOnChange(e.target.value || null)}
          >
            <option value="">Nothing linked</option>
            {props.workingOnOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>
        <ToggleRow label="Play music when it starts" checked={props.playMusicOnStart} onChange={props.onPlayMusicChange} />
        <ToggleRow label="Sound at the end" checked={props.soundAtEnd} onChange={props.onSoundAtEndChange} />
        <ToggleRow label="Start breaks automatically" checked={props.autoStartBreaks} onChange={props.onAutoStartBreaksChange} />
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-display text-[14px] text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="font-display text-[14px] text-text-muted">{label}</span>
      <Toggle checked={checked} onChange={onChange} aria-label={label} />
    </label>
  );
}
