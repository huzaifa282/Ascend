/**
 * Ascendant Tailwind preset — maps utility classes to the CSS variables in tokens.css.
 * Consumers extend this preset; raw hex values must never appear in component code.
 * (spec section 2, "Tailwind CSS mapped to the CSS variables in section 8")
 */
module.exports = {
  darkMode: ['class', '[data-theme]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        rule: 'var(--rule)',
        'rule-soft': 'var(--rule-soft)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'on-accent': 'var(--on-accent)',
        danger: 'var(--danger)',
        'danger-wash': 'var(--danger-wash)',
        ok: 'var(--ok)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      // Only non-numeric keys here: `half` and `touch` are additions, but a
      // bare numeral (`1`-`7`) collides with Tailwind's own default spacing
      // scale (e.g. `h-6` normally means 1.5rem/24px) and silently replaces
      // it project-wide for every component that uses that utility assuming
      // the default — which is every component here. See docs/decisions.md.
      spacing: {
        half: 'var(--space-half)',
        touch: 'var(--touch-min)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        window: 'var(--shadow-window)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
      minWidth: {
        touch: 'var(--touch-min)',
      },
      minHeight: {
        touch: 'var(--touch-min)',
      },
    },
  },
};
