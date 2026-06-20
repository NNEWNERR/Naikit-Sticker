/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        // Prototype confirms IBM Plex Sans Thai as the primary face.
        // Self-hosted from src/assets/fonts/ibm-plex-sans-thai.
        sans: ['"IBM Plex Sans Thai"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Brand — confirmed from prototype: pure brand-yellow on near-black ink.
        brand: {
          DEFAULT: '#FFD400',
          50:  '#FFFEF0',  // panel-tinted yellow (e.g. work-item footer)
          100: '#FFFBE5',  // brand-bg tint
          200: '#FFF6BF',
          300: '#FFED7A',
          400: '#FFE43D',
          500: '#FFD400', // primary
          600: '#E0B900',
          700: '#B89800',
          800: '#8F7600',
          900: '#665300',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          2: '#525252',  // prototype's mid-grey body text
          3: '#737373',  // prototype's tertiary text / muted labels
          4: '#A3A3A3',  // prototype's placeholder / disabled
        },
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#FAFAFA', // page canvas
          3: '#F4F4F4', // nested / kbd background
          4: '#EFEFEF',
        },
        line: {
          DEFAULT: '#E5E5E5',
          2: '#D4D4D4', // prototype dashed dividers + scrollbar thumb
        },
        // Semantic — recalibrated to the prototype's Tailwind-palette-derived
        // status colors. Each pair: `fg` (text) + `bg` (tint).
        accent:  { DEFAULT: '#16A34A', bg: '#DCFCE7' }, // success (green-600/100)
        warn:    { DEFAULT: '#CA8A04', bg: '#FFF7CC' }, // warning (yellow-600/100)
        danger:  { DEFAULT: '#DC2626', bg: '#FFE9E9' }, // danger (red-600 + tint)
        info:    { DEFAULT: '#0284C7' , bg: '#E0F2FE' }, // info (sky-600/100)
        // Urgent — the prototype's create-screen "ด่วน" CTA uses a more orange
        // red than --danger (#DC2626) so it sits visually next to it on the
        // job-priority strip without clashing. Source: prototype `UrgentBadge`.
        urgent:  { DEFAULT: '#E63946' },
        // Worksheet status palette — 8 pairs, sourced verbatim from prototype
        // assets/71f8a03f-…js STATUS_COLORS. Use via class plumbing in app code
        // rather than ad-hoc bg-* utilities so the pill component remains the
        // single source of truth.
        'status-design':    { fg: '#B91C1C', bg: '#FFE9E9', dot: '#DC2626' }, // รอออกแบบ
        'status-designing': { fg: '#075985', bg: '#E0F2FE', dot: '#0284C7' }, // กำลังออกแบบ
        'status-await':     { fg: '#854D0E', bg: '#FFF7CC', dot: '#CA8A04' }, // รอคอนเฟิร์มแบบ
        'status-confirmed': { fg: '#166534', bg: '#DCFCE7', dot: '#16A34A' }, // คอนเฟิร์มแล้ว
        'status-printq':    { fg: '#5B21B6', bg: '#EDE9FE', dot: '#7C3AED' }, // รอผลิต
        'status-printing':  { fg: '#3730A3', bg: '#E0E7FF', dot: '#4F46E5' }, // กำลังผลิต
        'status-deliverq':  { fg: '#9A3412', bg: '#FFEDD5', dot: '#EA580C' }, // รอส่งมอบ
        'status-delivered': { fg: '#115E59', bg: '#CCFBF1', dot: '#0D9488' }, // ส่งมอบแล้ว
      },
      borderRadius: {
        // Prototype uses small radii almost everywhere. 8/10 dominate. Larger
        // values kept only for legacy / occasional bigger surfaces.
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
      },
      borderWidth: {
        // Brutal 2/2.5/3 px ink borders are a core brand signature.
        '2.5': '2.5px',
        '3': '3px',
      },
      boxShadow: {
        // The brutal shadow language: hard offset, zero blur, ink-colored.
        // Tier by lift: `brutal-sm` (2px) → cards/buttons,
        //               `brutal`    (3px) → primary surfaces, pressed CTAs,
        //               `brutal-lg` (4px) → modals/login fields,
        //               `brutal-xl` (5px) → primary login button.
        'brutal-sm': '2px 2px 0 #0A0A0A',
        'brutal':    '3px 3px 0 #0A0A0A',
        'brutal-lg': '4px 4px 0 #0A0A0A',
        'brutal-xl': '5px 5px 0 #0A0A0A',
        // Inverted: black surface lifted on brand-yellow shadow (dark CTAs).
        'brutal-brand': '3px 3px 0 #FFD400',
        // Soft shadows — kept for non-branded states (e.g. small system UI
        // that should sit quietly). Not the default surface treatment.
        'soft':  '0 1px 0 rgba(10,10,10,.04), 0 8px 24px -12px rgba(10,10,10,.10)',
        'pop':   '0 8px 24px -4px rgba(10,10,10,.12), 0 4px 8px -2px rgba(10,10,10,.06)',
      },
      fontSize: {
        // Prototype scale — driven by ProtoTopBar h1 (22px desktop / 18 mobile),
        // panel headers (15-17), body (13-14), small/mono labels (10-12),
        // numeric display in JetBrains Mono (22-44).
        'display': ['44px', { lineHeight: '1',    letterSpacing: '-0.025em', fontWeight: '900' }],
        'h1':      ['22px', { lineHeight: '1.15', letterSpacing: '-0.02em',  fontWeight: '800' }],
        'h2':      ['18px', { lineHeight: '1.2',  fontWeight: '800' }],
        'h3':      ['15px', { lineHeight: '1.3',  fontWeight: '800' }],
        'body-lg': ['14px', { lineHeight: '1.55' }],
        'body':    ['13px', { lineHeight: '1.55' }],
        'body-sm': ['12px', { lineHeight: '1.5' }],
        'label':   ['11px', { lineHeight: '1.3', letterSpacing: '0.1em' }],
        'micro':   ['10px', { lineHeight: '1.2', letterSpacing: '0.12em', fontWeight: '800' }],
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
