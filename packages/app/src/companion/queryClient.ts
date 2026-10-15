import { QueryClient } from '@tanstack/react-query';

/**
 * A separate QueryClient per companion window (widget/strip/command) — each
 * is its own webview process, so there's nothing to share with `main`'s
 * client. Keeps these entries free of the router/LLM-pipeline weight
 * `App.tsx` pulls in (spec 7.1, docs/decisions.md's multi-page build note).
 */
export function createCompanionQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });
}
