import { QueryClientProvider } from '@tanstack/react-query';
import { createCompanionQueryClient } from './queryClient';
import { CommandContent } from './CommandContent';

const queryClient = createCompanionQueryClient();

export function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <CommandContent />
    </QueryClientProvider>
  );
}
