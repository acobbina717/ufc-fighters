import { useRef } from 'react'
import { useQuery } from 'convex/react'
import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server'

/**
 * Drop-in replacement for Convex `useQuery` that caches the last successful
 * result per hook instance. When the Convex WebSocket reconnects (code 1006),
 * `useQuery` briefly returns `undefined` — this hook returns the stale snapshot
 * instead, preventing downstream consumers from seeing a data gap.
 *
 * Skipped queries (`'skip'` arg) always return `undefined` and do not populate
 * the cache. On first load (no prior data), returns `undefined` normally so
 * loading states still work.
 */
export function useStableQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  args: FunctionArgs<Query> | 'skip',
): FunctionReturnType<Query> | undefined {
  const result: FunctionReturnType<Query> | undefined = useQuery(query, args)
  const cache = useRef<FunctionReturnType<Query> | undefined>(undefined)

  if (args !== 'skip' && result !== undefined) {
    cache.current = result
  }

  return args === 'skip' ? undefined : (result ?? cache.current)
}
