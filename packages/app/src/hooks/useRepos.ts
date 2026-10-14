import { createRepos, type Repos } from '@ascendant/db';
import { getDb } from '../platform';

let reposPromise: Promise<Repos> | null = null;

/** Every data hook calls this instead of repeating getDb()+createRepos(). */
export function resolveRepos(): Promise<Repos> {
  if (!reposPromise) {
    reposPromise = getDb().then(createRepos);
  }
  return reposPromise;
}
