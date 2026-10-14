import { useQuery } from '@tanstack/react-query';
import { resolveRepos } from './useRepos';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const repos = await resolveRepos();
      return repos.stats.list();
    },
  });
}
