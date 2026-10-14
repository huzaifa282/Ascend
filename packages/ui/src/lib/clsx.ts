/** Minimal classnames joiner — avoids pulling in a dependency for this alone. */
export default function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
