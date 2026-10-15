import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from '../layout/Shell';
import { Today } from '../screens/Today';
import { Status } from '../screens/Status';
import { Quests } from '../screens/Quests';
import { History } from '../screens/History';
import { Settings } from '../screens/Settings';
import { StatusSystem } from '../screens/StatusSystem';
import { Focus } from '../screens/Focus';
import { Music } from '../screens/Music';
import { Placeholder } from '../screens/Placeholder';
import { DevComponents } from '../screens/DevComponents';

/** Routes (main window) — spec 7.2. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/status" element={<Status />} />
          <Route path="/status/stat/:code" element={<Placeholder title="Stat detail" phase={7} />} />
          <Route path="/status/skills" element={<Placeholder title="Skills" phase={7} />} />
          <Route path="/status/system" element={<StatusSystem />} />
          <Route path="/status/report" element={<Placeholder title="Weekly report" phase={7} />} />
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
