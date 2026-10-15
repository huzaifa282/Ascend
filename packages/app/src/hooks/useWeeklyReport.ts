import { useQuery } from '@tanstack/react-query';
import { buildWeeklyReport, createServiceContext } from '../services';

export function useWeeklyReport() {
  return useQuery({
    queryKey: ['weeklyReport'],
    queryFn: async () => {
      const ctx = await createServiceContext();
      return buildWeeklyReport(ctx, Date.now());
    },
  });
}
