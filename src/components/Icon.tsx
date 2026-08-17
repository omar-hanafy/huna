import type { ReactElement, SVGProps } from 'react';

type IconName =
  | 'home'
  | 'calendar'
  | 'tools'
  | 'journal'
  | 'chart'
  | 'settings'
  | 'compass'
  | 'wind'
  | 'walk'
  | 'pulse'
  | 'sparkles'
  | 'check'
  | 'chevron'
  | 'play'
  | 'pause'
  | 'reset'
  | 'eye'
  | 'ear'
  | 'hand'
  | 'nose'
  | 'taste'
  | 'shield'
  | 'download'
  | 'upload'
  | 'trash'
  | 'plus'
  | 'clock'
  | 'moon'
  | 'heart'
  | 'info'
  | 'menu'
  | 'close'
  | 'arrow'
  | 'target'
  | 'leaf';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, ReactElement> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  tools: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5-5L7 4l3 3-2 2-3-3-2.7 2.7a4 4 0 0 0 5 5L17 23l6-6-8.3-10.7Z" />
      <path d="m14 14 3 3" />
    </>
  ),
  journal: (
    <>
      <path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z" />
      <path d="M7 4v16M10 8h6M10 12h6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="m7 15 4-4 3 2 5-6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.17.36.46.7.8.9.33.2.7.3 1.1.3h.1v4h-.1c-.4 0-.77.1-1.1.3-.34.2-.63.54-.8.9Z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h10a3 3 0 1 0-3-3" />
      <path d="M3 12h15a3 3 0 1 1-3 3" />
      <path d="M3 16h7" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="m11 8-2 5 4 2 2 6M12 10l4 3 3-1M9 13l-4 6" />
    </>
  ),
  pulse: (
    <>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z" />
      <path d="m19 13 .8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13ZM5 14l.7 1.8 1.8.7-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14Z" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  pause: (
    <>
      <path d="M9 5v14M15 5v14" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  ear: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 7-5 5-5 10a3 3 0 0 1-6 0" />
      <path d="M9 10a3 3 0 0 1 6 0c0 3-3 3-3 6" />
    </>
  ),
  hand: (
    <>
      <path d="M7 11V6a2 2 0 0 1 4 0v5" />
      <path d="M11 11V4a2 2 0 0 1 4 0v7" />
      <path d="M15 11V6a2 2 0 0 1 4 0v7c0 5-3 8-7 8h-1c-2 0-4-1-5-3l-3-5a2 2 0 0 1 3-2l1 1" />
    </>
  ),
  nose: (
    <>
      <path d="M12 3c0 5-1 7-2 9-.8 1.6 0 3 2 3h2" />
      <path d="M9 18c2 2 5 2 7 0" />
    </>
  ),
  taste: (
    <>
      <path d="M4 11c4-2 12-2 16 0-2 6-5 9-8 9s-6-3-8-9Z" />
      <path d="M8 13h8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 17V5" />
      <path d="m7 10 5-5 5 5" />
      <path d="M5 21h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C12 4 6 8 5 15c4 1 9 0 12-4" />
      <path d="M4 20c3-5 7-8 12-10" />
    </>
  ),
};

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
