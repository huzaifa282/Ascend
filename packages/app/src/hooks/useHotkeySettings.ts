import { useQuery } from '@tanstack/react-query';
import { resolveRepos } from './useRepos';
import type { HotkeySettings } from '../settings/schema';

export function useHotkeySettings() {
  return useQuery({
    queryKey: ['hotkey', 'settings'],
    queryFn: async () => {
      const repos = await resolveRepos();
      const row = await repos.settings.get();
      return (row?.hotkey as HotkeySettings | undefined) ?? null;
    },
  });
}
