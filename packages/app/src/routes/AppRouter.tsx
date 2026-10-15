import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { Shell } from '../layout/Shell';
import { Today } from '../screens/Today';
import { Status } from '../screens/Status';
import { Quests } from '../screens/Quests';
import { History } from '../screens/History';
import { Settings } from '../screens/Settings';
import { StatusSystem } from '../screens/StatusSystem';
import { Focus } from '../screens/Focus';
import { Music } from '../screens/Music';
import { StatDetail } from '../screens/StatDetail';
import { Skills } from '../screens/Skills';
import { WeeklyReport } from '../screens/WeeklyReport';
import { Placeholder } from '../screens/Placeholder';
import { DevComponents } from '../screens/DevComponents';

interface NavigatePayload {
  route: string;
}

/** Listens for Rust's `navigate` event (spec 7.1: the widget/tray/hotkey ask `main` to go somewhere via `open_main`). */
function NavigateListener() {
  const navigate = useNavigate();
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<NavigatePayload>('navigate', (event) => navigate(event.payload.route)).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [navigate]);
  return null;
}

/** Routes (main window) — spec 7.2. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <NavigateListener />
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/status" element={<Status />} />
          <Route path="/status/stat/:code" element={<StatDetail />} />
          <Route path="/status/skills" element={<Skills />} />
          <Route path="/status/system" element={<StatusSystem />} />
          <Route path="/status/report" element={<WeeklyReport />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/quests/:id" element={<Placeholder title="Quest" phase={3} />} />
          <Route path="/music" element={<Music />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Navigate to="/settings/model" replace />} />
          <Route path="/settings/:section" element={<Settings />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/onboarding/:step" element={<Placeholder title="Awakening" phase={7} />} />
          <Route path="/dev/components" element={<DevComponents />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
