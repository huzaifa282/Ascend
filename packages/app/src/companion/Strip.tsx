import { QueryClientProvider } from '@tanstack/react-query';
import { createCompanionQueryClient } from './queryClient';
import { StripContent } from './StripContent';

const queryClient = createCompanionQueryClient();

export function Strip() {
  return (
    <QueryClientProvider client={queryClient}>
      <StripContent />
    </QueryClientProvider>
  );
}
