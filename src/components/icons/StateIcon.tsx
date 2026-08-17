import type { StateId } from '../../content/schema';

/**
 * Level 2 of the icon hierarchy: hand-drawn state illustrations.
 *
 * Drawn in the Jot manner - loose dark linework, deliberately imperfect, one
 * muted accent, no shadow and no gradient. They carry warmth without adding a
 * character that watches the user.
 *
 * None of them use alarm imagery. No sirens, no warning triangles, no radar, no
 * heartbeat traces: the state being reported is ordinary, and drawing it as an
 * emergency would contradict everything the copy says.
 *
 * Colour never carries meaning here; every icon reads in monochrome, and each
 * one is paired with its label on screen.
 */

interface StateIconProps {
  state: StateId;
  size?: number;
  className?: string;
}

const STROKE = 'var(--outline)';
const ACCENT = 'var(--accent-sage)';

export function StateIcon({ state, size = 56, className }: StateIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke: STROKE,
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    className,
  };

  switch (state) {
    // An eye, and three neutral objects it could rest on instead.
    case 'scanning':
      return (
        <svg {...common}>
          <path d="M8 26c6-7 14-10 20-10s14 3 20 10c-6 7-14 10-20 10S14 33 8 26" />
          <circle cx="28" cy="26" r="5" fill={ACCENT} stroke="none" />
          <circle cx="28" cy="26" r="5.5" />
          <rect x="10" y="46" width="10" height="9" rx="2" />
          <circle cx="32" cy="50.5" r="4.5" />
          <path d="M46 55l5-9 5 9z" />
        </svg>
      );

    // An ear and a single sound wave. One wave, not a burst.
    case 'startled':
      return (
        <svg {...common}>
          <path d="M22 44c0-4-3-6-4-10a13 13 0 1 1 26 0c0 9-7 10-9 14s-6 6-9 4" />
          <path d="M30 26a5 5 0 0 1 8 4c0 4-4 4-5 7" />
          <path d="M50 20c4 4 4 12 0 16" stroke={ACCENT} />
        </svg>
      );

    // A seated figure, hands resting on the legs.
    case 'activated':
      return (
        <svg {...common}>
          <circle cx="32" cy="15" r="7" />
          <path d="M22 42V32a10 10 0 0 1 20 0v10" />
          <path d="M22 42h20l3 12H19z" fill={ACCENT} fillOpacity="0.35" />
          <path d="M25 36h6M33 36h6" />
        </svg>
      );

    // A hand meeting a textured surface. Touch, not breath.
    case 'detached':
      return (
        <svg {...common}>
          <path d="M20 40V22a3 3 0 0 1 6 0v10V16a3 3 0 0 1 6 0v14V20a3 3 0 0 1 6 0v12" />
          <path d="M38 32v-6a3 3 0 0 1 6 0v16c0 8-6 12-13 12s-13-4-13-12v-2" />
          <path d="M12 54h40" stroke={ACCENT} />
          <path d="M16 58h6M28 58h6M40 58h6" stroke={ACCENT} />
        </svg>
      );

    // A thought passing above a head, not settling into it.
    case 'predicting':
      return (
        <svg {...common}>
          <path d="M20 54V44a12 12 0 0 1 24 0v10" />
          <circle cx="32" cy="34" r="7" />
          <path
            d="M24 16a6 6 0 0 1 11-3 6 6 0 0 1 8 8 5 5 0 0 1-6 4H28a6 6 0 0 1-4-9z"
            fill={ACCENT}
            fillOpacity="0.3"
          />
        </svg>
      );

    // A moon above a pillow. Rest, with no clock in sight.
    case 'sleepless':
      return (
        <svg {...common}>
          <path d="M40 8a13 13 0 1 0 12 18A14 14 0 0 1 40 8z" fill={ACCENT} fillOpacity="0.35" />
          <path d="M10 46c0-5 4-8 10-8h20c6 0 10 3 10 8v4c0 3-3 5-7 5H17c-4 0-7-2-7-5z" />
          <path d="M18 46c4-3 10-4 14-4s10 1 14 4" />
        </svg>
      );

    // Not knowing, drawn as an open question rather than an alarm.
    case 'unsure':
    default:
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="20" />
          <path d="M12 32c6-5 14-5 20 0s14 5 20 0" stroke={ACCENT} />
          <circle cx="32" cy="32" r="3.5" fill={STROKE} stroke="none" />
        </svg>
      );
  }
}
