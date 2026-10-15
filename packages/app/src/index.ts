export { App } from './App';
// Widget/Strip/Command are deliberately NOT re-exported here: this barrel
// also exports `App` (full router + every screen + the LLM pipeline), and
// routing the companion entries through it would pull all of that into
// their bundles too. apps/desktop imports them via the `@ascendant/app/companion/*`
// alias instead (vite.config.ts), bypassing this file (docs/decisions.md).
export { useUiStore } from './stores/useUiStore';
export type { AccentTheme } from './stores/useUiStore';
export * from './lib/localTime';
export * from './platform';
export * from './services';
export * from './settings/schema';
export * from './hooks';
export * from './system/messages';
