import { useQuery } from '@tanstack/react-query';
import { resolveRepos } from './useRepos';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const repos = await resolveRepos();
      return (await repos.profile.get()) ?? null;
    },
  });
}
