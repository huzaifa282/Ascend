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
      spacing: {
        half: 'var(--space-half)',
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        7: 'var(--space-7)',
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
