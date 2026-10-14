export function Placeholder({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6">
      <h1 className="font-display text-[28px] leading-8 font-bold a-heading mb-2">{title}</h1>
      <p className="text-text-muted">Built in phase {phase} of the build spec.</p>
    </div>
  );
}
