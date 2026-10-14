import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ClockCard,
  CommandBar,
  Countdown,
  Dial,
  HpSegments,
  Icon,
  IconButton,
  LevelChip,
  LevelRoll,
  MicButton,
  Modal,
  MusicCard,
  Notification,
  NowPlaying,
  PlayButton,
  PlayerBar,
  QuestRow,
  RankBadge,
  RewardBadge,
  RoundButton,
  Segmented,
  StatFader,
  SystemMessage,
  Tabs,
  TaskList,
  TimerModal,
  Toggle,
  TypeTag,
  Waveform,
  XpRuler,
  XpStrip,
} from '@ascendant/ui';
import type { IconKey } from '@ascendant/ui';

const ICONS: IconKey[] = [
  'home', 'gauge', 'list', 'note', 'cal', 'gear', 'timer', 'mic', 'check', 'x',
  'edit', 'plus', 'pin', 'expand', 'collapse', 'warn', 'shield', 'clock', 'enter',
  'chat', 'bolt', 'chev', 'lock', 'share', 'trash', 'rest', 'stop', 'prev', 'next',
  'play', 'pause', 'shuffle', 'repeat', 'heart', 'vol', 'ext', 'folder', 'copy',
  'speaker', 'queue', 'search',
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted border-b border-rule pb-2">
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

/** /dev/components — kitchen sink showing every component in every state (spec 9, phase 3). */
export function DevComponents() {
  const [segValue, setSegValue] = useState<'a' | 'b' | 'c'>('a');
  const [tabValue, setTabValue] = useState<'one' | 'two'>('one');
  const [toggleOn, setToggleOn] = useState(true);
  const [checked, setChecked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [cmdValue, setCmdValue] = useState('');
  const [recording, setRecording] = useState(false);

  return (
    <div className="max-w-[1100px] mx-auto px-2 py-6 flex flex-col gap-8">
      <h1 className="font-display text-[28px] leading-8 font-bold a-heading">Kitchen sink</h1>

      <Section title="Buttons">
        <Button variant="default">Default</Button>
        <Button variant="primary">Primary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <Button variant="default" size="sm">
          Small
        </Button>
        <IconButton icon="gear" aria-label="Settings" />
        <RoundButton icon="mic" aria-label="Mic" />
        <PlayButton playing={false} aria-label="Play" />
        <PlayButton playing aria-label="Pause" size="large" />
      </Section>

      <Section title="Toggle / Segmented / Tabs / Checkbox">
        <Toggle checked={toggleOn} onChange={setToggleOn} aria-label="Demo toggle" />
        <Segmented
          aria-label="Demo segmented"
          value={segValue}
          onChange={setSegValue}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
            { value: 'c', label: 'C' },
          ]}
        />
        <Tabs
          aria-label="Demo tabs"
          value={tabValue}
          onChange={setTabValue}
          items={[
            { value: 'one', label: 'One' },
            { value: 'two', label: 'Two' },
          ]}
        />
        <Checkbox checked={checked} onChange={setChecked} aria-label="Demo checkbox" />
      </Section>

      <Section title="Badge / TypeTag / RewardBadge">
        <Badge tone="ok">CONNECTED</Badge>
        <Badge tone="mid">MID</Badge>
        <Badge tone="danger">LATE</Badge>
        <Badge tone="danger-fill">FAILED</Badge>
        <Badge tone="muted">MUTED</Badge>
        <TypeTag kind="log" />
        <TypeTag kind="task" />
        <RewardBadge tier="early" />
        <RewardBadge tier="on_time" />
        <RewardBadge tier="grace" gracePercent={78} />
        <RewardBadge tier="late" />
        <RewardBadge tier="failed" hpLoss={8} />
        <RewardBadge tier="rest" />
      </Section>

      <Section title="Icons (24px grid)">
        {ICONS.map((name) => (
          <div key={name} className="flex flex-col items-center gap-1 w-14">
            <Icon name={name} />
            <span className="font-mono text-[9px] text-text-muted">{name}</span>
          </div>
        ))}
      </Section>

      <Section title="Level, rank, HP">
        <LevelChip level={23} rank="D" xpIntoLevel={2340} xpNeeded={3000} />
        <RankBadge rank="D" />
        <RankBadge rank="C" locked />
        <LevelRoll from={23} to={24} size={64} />
        <HpSegments hp={70} />
        <HpSegments hp={22} />
      </Section>

      <Section title="XP ruler / strip">
        <XpRuler level={23} xpIntoLevel={2340} xpNeeded={3000} xpGainedToday={186} className="w-[420px]" />
        <XpStrip dailyXp={Array.from({ length: 61 }, (_, i) => (i % 7 === 0 ? 0 : Math.round(50 + Math.sin(i / 3) * 40 + i))) } className="w-[500px]" />
      </Section>

      <Section title="Stat faders">
        <StatFader code="FOC" name="Focus" value={82} gain={5} />
        <StatFader code="END" name="Endurance" value={40} />
        <StatFader code="VIT" name="Vitality" value={30} neglected idleDays={6} />
        <StatFader code="INT" name="Intellect" value={55} dense />
      </Section>

      <Section title="Quest rows / countdown">
        <div className="w-[420px] rounded-lg border border-rule overflow-hidden">
          <QuestRow title="Read 20 pages" statCode="INT" xp={40} onToggle={() => {}} />
          <QuestRow title="Submit the invoice" done statCode="DIS" xp={20} onToggle={() => {}} />
          <QuestRow title="Finish the lab report" late statCode="DIS" xp={30} onToggle={() => {}} />
        </div>
        <Countdown remainingMs={2.5 * 60 * 60 * 1000} size={40} />
        <Countdown remainingMs={-20 * 60 * 1000} size={40} />
      </Section>

      <Section title="Today's task list">
        <TaskList
          tasks={[
            { id: '1', title: 'Pay the hosting invoice', time: '09:00', done: false, xp: 20 },
            { id: '2', title: 'Send revised proposal', time: '18:00', isNow: true, done: false, xp: 40 },
            { id: '3', title: 'Call the dentist', done: true, xp: 20 },
          ]}
          onToggle={() => {}}
          onAddTask={() => {}}
        />
      </Section>

      <Section title="Clock / Dial / Timer modal">
        <ClockCard state="running" elapsedMin={18} totalMin={25} onOpen={() => setTimerModalOpen(true)} onPlayPause={() => {}} />
        <Dial elapsedMin={18} totalMin={25} />
        <Button variant="default" onClick={() => setTimerModalOpen(true)}>
          Open timer modal
        </Button>
        <TimerModal
          open={timerModalOpen}
          onClose={() => setTimerModalOpen(false)}
          elapsedMin={18}
          totalMin={25}
          onBreak={false}
          lengthPreset="25"
          onLengthChange={() => {}}
          breakPreset="5"
          onBreakChange={() => {}}
          workingOnOptions={[{ id: '1', label: 'Deep work block' }]}
          workingOnId={null}
          onWorkingOnChange={() => {}}
          playMusicOnStart={false}
          onPlayMusicChange={() => {}}
          soundAtEnd
          onSoundAtEndChange={() => {}}
          autoStartBreaks={false}
          onAutoStartBreaksChange={() => {}}
          onStop={() => {}}
          onPause={() => {}}
          onAddFive={() => {}}
          onFullScreen={() => {}}
        />
      </Section>

      <Section title="Command bar / voice">
        <CommandBar
          value={cmdValue}
          onChange={setCmdValue}
          onSubmit={() => {}}
          hotkeyHint="Ctrl+Shift+Space"
          micDisabled
          micTitle="Voice input is coming in a later version"
          showStatusStrip
          status="connected"
          statusText="Connected"
          className="w-[480px]"
        />
        <MicButton recording={recording} onClick={() => setRecording((r) => !r)} />
        <Waveform active={recording} className="w-64" />
      </Section>

      <Section title="System messages / notifications">
        <div className="w-[420px]">
          <SystemMessage kind="gain" time="08:14" text="Focus increased by 3." isNew />
          <SystemMessage kind="ok" time="08:02" text="Quest complete: Read 20 pages. +40 XP." />
          <SystemMessage kind="danger" time="07:50" text="Deadline missed. HP decreased by 8." />
        </div>
        <Notification
          appLabel="ASCENDANT"
          tag="DEADLINE"
          time="2H"
          title="Send revised proposal"
          meta="Due at 18:00"
          actions={[{ label: 'Mark done', onClick: () => {} }, { label: 'Snooze', onClick: () => {} }]}
        />
        <Notification appLabel="ASCENDANT" tag="DANGER" time="NOW" title="HP is low" danger />
      </Section>

      <Section title="Music">
        <MusicCard nothingPlaying onOpenFolder={() => {}} />
        <MusicCard
          title="Weightless Hours"
          artist="Lumen Field"
          positionS={97}
          durationS={243}
          playing
          source="MUSIC FOLDER"
          onPlayPause={() => {}}
          onPrev={() => {}}
          onNext={() => {}}
        />
        <div className="w-full border border-rule rounded-lg p-4">
          <NowPlaying
            title="Weightless Hours"
            artist="Lumen Field"
            album="Night Shift"
            positionS={97}
            durationS={243}
            playing
            volume={70}
            source="MUSIC FOLDER"
            onPlayPause={() => {}}
            onPrev={() => {}}
            onNext={() => {}}
            onSeek={() => {}}
            onShuffle={() => {}}
            onRepeat={() => {}}
            onVolumeChange={() => {}}
          />
        </div>
        <div className="w-full border-t border-rule">
          <PlayerBar
            title="Weightless Hours"
            artist="Lumen Field"
            playing
            positionS={97}
            durationS={243}
            volume={70}
            timerLabel="18:42"
            timerKind="FOCUS"
            onPlayPause={() => {}}
            onPrev={() => {}}
            onNext={() => {}}
            onVolumeChange={() => {}}
            onSeek={() => {}}
          />
        </div>
      </Section>

      <Section title="Card / Modal">
        <Card title="Card title" className="w-80">
          <div className="p-4 text-text-muted">Card body content.</div>
        </Card>
        <Button variant="default" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example modal"
          footer={
            <>
              <Button variant="default" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-text-muted">Modal body content.</p>
        </Modal>
      </Section>
    </div>
  );
}
