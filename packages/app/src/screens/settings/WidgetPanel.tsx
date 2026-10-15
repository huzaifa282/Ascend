import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Segmented, Toggle } from '@ascendant/ui';
import { usePatchWidgetSettings, useWidgetSettings } from '../../hooks';

/** Settings > Widget (spec 10.16, 11.5): always on top, start with system, default size, opacity. */
export function WidgetPanel() {
  const { data: widgetSettings } = useWidgetSettings();
  const patch = usePatchWidgetSettings();
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    invoke<boolean>('is_autostart_enabled').then(setAutostart).catch(() => {});
  }, []);

  const toggleAutostart = async (enabled: boolean) => {
    await invoke('set_autostart', { enabled });
    setAutostart(enabled);
    patch.mutate({ startWithSystem: enabled });
  };

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-display text-[22px] font-bold a-heading">Widget</h1>

      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="font-display text-[14px]">Always on top</span>
        <Toggle
          checked={widgetSettings?.alwaysOnTop ?? true}
          onChange={(v) => patch.mutate({ alwaysOnTop: v })}
          aria-label="Always on top"
        />
      </label>

      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="font-display text-[14px]">Start with system</span>
        <Toggle checked={autostart} onChange={(v) => void toggleAutostart(v)} aria-label="Start with system" />
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Default size</span>
        <Segmented
          aria-label="Default size"
          value={widgetSettings?.defaultSize ?? 'expanded'}
          onChange={(v) => patch.mutate({ defaultSize: v })}
          options={[
            { value: 'expanded', label: 'Expanded' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-display text-[14px]" htmlFor="widget-opacity">
          Opacity ({widgetSettings?.opacity ?? 100}%)
        </label>
        <input
          id="widget-opacity"
          type="range"
          min={60}
          max={100}
          value={widgetSettings?.opacity ?? 100}
          onChange={(e) => patch.mutate({ opacity: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
