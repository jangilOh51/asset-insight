/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic (Korean convention: 상승=빨강, 하락=파랑) ──
        profit:       '#EF4444',
        'profit-soft':'#DC2626',
        'profit-deep':'#991B1B',
        loss:         '#60A5FA',
        'loss-soft':  '#3B82F6',
        'loss-deep':  '#1E40AF',
        neutral:      '#9CA3AF',

        // ── Asset Insight surface scale ──
        'ai-bg':           '#0B111B',
        'ai-surface':      '#111827',
        'ai-surface-alt':  '#141920',
        'ai-card':         '#1A2332',
        'ai-card-elevated':'#1E2D3E',
        'ai-sidebar':      '#030712',

        // ── Border ──
        'ai-border':      '#2A3F55',
        'ai-border-soft': '#374151',

        // ── Accent ──
        'ai-accent':      '#06B6D4',
        'ai-accent-400':  '#22D3EE',
        'ai-slate-blue':  '#1E3A5F',

        // ── Text ──
        'ai-fg1': '#F9FAFB',
        'ai-fg2': '#D1D5DB',
        'ai-fg3': '#9CA3AF',
        'ai-fg4': '#6B7280',

        // ── Legacy aliases (keep for backward compat) ──
        'apple-bg':       '#0B111B',
        'apple-surface':  '#111827',
        'apple-elevated': '#1A2332',
        'apple-fill':     '#1E2D3E',
        'apple-label':    '#F9FAFB',
        'apple-label2':   '#D1D5DB',
        'apple-label3':   '#9CA3AF',
        'apple-blue':     '#06B6D4',
        'apple-green':    '#22C55E',
        'apple-red':      '#EF4444',
        'apple-sep':      '#2A3F55',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable', 'Pretendard',
          '-apple-system', 'BlinkMacSystemFont',
          'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif',
        ],
        mono: [
          'JetBrains Mono', 'ui-monospace', 'SF Mono',
          'Menlo', 'Consolas', 'monospace',
        ],
      },
      borderRadius: {
        'apple':    '8px',
        'apple-lg': '12px',
        'apple-xl': '16px',
      },
    },
  },
  plugins: [],
};
