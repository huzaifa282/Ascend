import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CommandBarContainer } from '../components/CommandBarContainer';
import { PlayerBarSlot } from '../components/PlayerBarSlot';
import { MomentsOverlay } from '../components/MomentsOverlay';
import { ToastStack } from '../components/ToastStack';
import { useDayCloseOnMount } from '../hooks/useDayCloseOnMount';
import { usePenaltyZoneStatus } from '../hooks/usePenaltyZone';
import { useProfile } from '../hooks/useProfile';
import { useHpLowToast } from '../hooks/useHpLowToast';
import { clsx } from '@ascendant/ui';

const NO_PLAYER_BAR_ROUTES = ['/today', '/music', '/focus'];

/**
 * Main window shell — spec 7.2.
 * Top bar: the command bar spanning the content width; nothing else.
 * Bottom: the player bar on every route except Today, Music and Focus.
 */
export function Shell() {
  const location = useLocation();
  const isFocusMode = location.pathname.startsWith('/focus');
  const showPlayerBar = !NO_PLAYER_BAR_ROUTES.some((r) => location.pathname.startsWith(r));
  const { data: penaltyZone } = usePenaltyZoneStatus();
  const inPenaltyZone = Boolean(penaltyZone?.active);
  const { data: profile, isLoading: profileLoading } = useProfile();

  useDayCloseOnMount();
  useHpLowToast();

  // Spec 10.1: a brand-new install has no profile row at all — send it to
  // Awakening instead of rendering every screen's "if (!profile) return
  // null" blank state.
  if (!profileLoading && profile === null) {
    return <Navigate to="/onboarding/1" replace />;
  }

  if (isFocusMode) {
    // Full window, no sidebar or command bar (spec 10.15).
    return (
      <div className="h-screen w-screen bg-bg text-text">
        <Outlet />
        <MomentsOverlay />
        <ToastStack />
      </div>
    );
  }

  return (
    <div className={clsx('h-screen w-screen bg-bg text-text flex', inPenaltyZone && 'border-2 border-danger')}>
      <MomentsOverlay />
      <ToastStack />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className={clsx('min-h-[76px] flex-none flex items-center px-6 py-3 border-b', inPenaltyZone ? 'border-danger' : 'border-rule')}
        >
          <CommandBarContainer />
        </header>
        {inPenaltyZone && (
          <div className="flex-none bg-danger-wash px-6 py-2 font-mono text-[11px] uppercase tracking-[.1em] text-danger">
            PENALTY ZONE / XP gain is halved until the recovery quest is complete.
          </div>
        )}
        <main className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-gutter:stable]">
          <Outlet />
        </main>
        {showPlayerBar && (
          <footer className="flex-none border-t border-rule">
            <PlayerBarSlot />
          </footer>
        )}
      </div>
    </div>
  );
}
