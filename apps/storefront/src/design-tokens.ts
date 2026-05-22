export const tokens = {
  colors: {
    primary:               '#1A1A1A',
    primaryForeground:     '#faf7f6',
    primaryMuted:          '#5f5e5e',
    background:            '#fbf9f5',
    foreground:            '#30332e',
    muted:                 '#f5f4ef',
    mutedForeground:       '#5d605a',
    surface:               '#eeeee8',
    surfaceLowest:         '#ffffff',
    border:                '#b1b3ab',
    accent:                '#705b44',
    accentForeground:      '#fff7f3',
    accentContainer:       '#fadec0',
    destructive:           '#9e422c',
    destructiveForeground: '#fff7f6',
  },
  fontFamily: {
    heading: '"Noto Serif", serif',
    body:    '"Manrope", sans-serif',
  },
  radius: {
    sm:   '4px',
    md:   '8px',
    lg:   '8px',
    full: '9999px',
  },
  container: {
    maxWidth: '1280px',
    gutter:   '24px',
  },
} as const;
