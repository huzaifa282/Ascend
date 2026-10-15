/** Settings > About (spec 10.16). */
export function AboutPanel() {
  const links = [
    { label: 'Source code', href: 'https://github.com/huzaifa282/Ascend' },
    { label: 'Documentation', href: 'https://github.com/huzaifa282/Ascend/blob/main/docs/SPEC.md' },
    { label: 'Report an issue', href: 'https://github.com/huzaifa282/Ascend/issues' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-display text-[22px] font-bold a-heading">About</h1>
      <div className="flex flex-col gap-1">
        <span className="font-display text-[15px] font-semibold">Ascendant</span>
        <span className="font-mono text-[11px] text-text-muted">Version 0.1.0</span>
        <span className="font-mono text-[11px] text-text-muted">MIT License</span>
      </div>
      <div className="flex flex-col gap-2">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="font-display text-[14px] text-accent hover:underline"
          >
            {l.label}
          </a>
        ))}
      </div>
      <p className="text-text-muted">An open-source, local-first life-RPG and daily companion.</p>
    </div>
  );
}
