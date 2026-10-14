import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CommandBarContainer } from '../components/CommandBarContainer';
import { PlayerBarSlot } from '../components/PlayerBarSlot';

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

  if (isFocusMode) {
    // Full window, no sidebar or command bar (spec 10.15).
    return (
      <div className="h-screen w-screen bg-bg text-text">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-bg text-text flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-[76px] flex-none flex items-center px-6 py-3 border-b border-rule">
          <CommandBarContainer />
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
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
