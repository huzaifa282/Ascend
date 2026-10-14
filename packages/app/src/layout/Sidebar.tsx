import { NavLink } from 'react-router-dom';
import { Icon, clsx } from '@ascendant/ui';
import type { IconKey } from '@ascendant/ui';
import { useProfile } from '../hooks/useProfile';

interface NavItem {
  to: string;
  label: string;
  icon: IconKey;
}

// Leveling on: Today, Status, Quests, Music, History, Settings (spec 7.2).
const NAV_LEVELING_ON: NavItem[] = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/status', label: 'Status', icon: 'gauge' },
  { to: '/quests', label: 'Quests', icon: 'list' },
  { to: '/music', label: 'Music', icon: 'note' },
  { to: '/history', label: 'History', icon: 'cal' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
];

// Leveling off: Quests becomes Tasks, Status hidden.
const NAV_LEVELING_OFF: NavItem[] = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/quests', label: 'Tasks', icon: 'list' },
  { to: '/music', label: 'Music', icon: 'note' },
  { to: '/history', label: 'History', icon: 'cal' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
];

export function Sidebar() {
  const { data: profile } = useProfile();
  const levelingEnabled = profile?.levelingEnabled ?? true;
  const items = levelingEnabled ? NAV_LEVELING_ON : NAV_LEVELING_OFF;

  return (
    <nav
      aria-label="Main"
      className="w-[200px] flex-none h-full border-r border-rule flex flex-col py-3"
    >
      <div className="px-3 pb-3 mb-1">
        <span className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">
          Ascendant
        </span>
      </div>
      <ul className="flex flex-col gap-half">
        {items.map((item) => (
          <li key={item.to} className="px-2">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 h-touch px-2 rounded-md transition-colors duration-base',
                  isActive
                    ? 'bg-surface text-text'
                    : 'text-text-muted hover:text-text hover:bg-surface',
                )
              }
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[15px]">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
