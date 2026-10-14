import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from '../layout/Shell';
import { Today } from '../screens/Today';
import { Placeholder } from '../screens/Placeholder';

/** Routes (main window) — spec 7.2. */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/status" element={<Placeholder title="Status" phase={3} />} />
          <Route path="/status/stat/:code" element={<Placeholder title="Stat detail" phase={7} />} />
          <Route path="/status/skills" element={<Placeholder title="Skills" phase={7} />} />
          <Route path="/status/system" element={<Placeholder title="The System" phase={7} />} />
          <Route path="/status/report" element={<Placeholder title="Weekly report" phase={7} />} />
          <Route path="/quests" element={<Placeholder title="Quests" phase={3} />} />
          <Route path="/quests/:id" element={<Placeholder title="Quest" phase={3} />} />
          <Route path="/music" element={<Placeholder title="Music" phase={5} />} />
          <Route path="/history" element={<Placeholder title="History" phase={3} />} />
          <Route path="/settings" element={<Navigate to="/settings/model" replace />} />
          <Route path="/settings/:section" element={<Placeholder title="Settings" phase={3} />} />
          <Route path="/focus" element={<Placeholder title="Focus mode" phase={5} />} />
          <Route path="/onboarding/:step" element={<Placeholder title="Awakening" phase={7} />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
