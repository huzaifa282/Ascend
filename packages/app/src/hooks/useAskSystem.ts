import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { askSystem as askSystemService, createServiceContext } from '../services';
import { resolveRepos } from './useRepos';

export function useChatMessages() {
  return useQuery({
    queryKey: ['chatMessages'],
    queryFn: async () => {
      const repos = await resolveRepos();
      return (await repos.chatMessages.listRecent(50)).reverse();
    },
  });
}

export function useAskSystem() {
  const [pending, setPending] = useState(false);
  const chat = useChatMessages();

  const ask = useCallback(
    async (question: string) => {
      setPending(true);
      try {
        const ctx = await createServiceContext();
        await askSystemService(ctx, question, Date.now());
        await chat.refetch();
      } finally {
        setPending(false);
      }
    },
    [chat],
  );

  return { messages: chat.data ?? [], pending, ask };
}
