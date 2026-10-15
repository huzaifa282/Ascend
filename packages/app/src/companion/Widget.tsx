import { QueryClientProvider } from '@tanstack/react-query';
import { createCompanionQueryClient } from './queryClient';
import { WidgetContent } from './WidgetContent';

const queryClient = createCompanionQueryClient();

export function Widget() {
  return (
    <QueryClientProvider client={queryClient}>
      <WidgetContent />
    </QueryClientProvider>
  );
}
