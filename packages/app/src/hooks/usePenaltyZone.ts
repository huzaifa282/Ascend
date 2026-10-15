import { useQuery } from '@tanstack/react-query';
import { createServiceContext, getPenaltyZoneStatus } from '../services';

export function usePenaltyZoneStatus() {
  return useQuery({
    queryKey: ['penaltyZone'],
    queryFn: async () => {
      const ctx = await createServiceContext();
      return getPenaltyZoneStatus(ctx, Date.now());
    },
    refetchInterval: 30_000,
  });
}
