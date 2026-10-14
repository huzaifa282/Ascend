/**
 * Generates docs/ruleset.md from DEFAULT_RULESET (spec section 5: "Generate
 * docs/ruleset.md from it with a script."). Run with `pnpm gen:ruleset`.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_RULESET } from '../src/ruleset';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../../../docs/ruleset.md');

function renderSection(key: string, value: unknown, depth: number): string {
  const heading = '#'.repeat(Math.min(depth + 2, 6));
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return `- \`${key}\`: \`${JSON.stringify(value)}\`\n`;
  }
  let out = `${heading} ${key}\n\n`;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out += renderSection(k, v, depth + 1);
    } else {
      out += `- \`${k}\`: \`${JSON.stringify(v)}\`\n`;
    }
  }
  return out + '\n';
}

let md = '# Ruleset reference\n\n';
md += 'Generated from `packages/engine/src/ruleset.ts`. Do not edit by hand — run ';
md += '`pnpm gen:ruleset` after changing `DEFAULT_RULESET`.\n\n';

for (const [section, value] of Object.entries(DEFAULT_RULESET)) {
  md += renderSection(section, value, 0);
}

writeFileSync(outPath, md, 'utf-8');
console.log(`Wrote ${outPath}`);
