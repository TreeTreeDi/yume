export const INKS = {
  dark: {
    text: '#d9dfea',
    dim: '#8a93a5',
    faint: '#5a6375',
    mint: '#4fe3c1',
    blue: '#6ea8ff',
    yellow: '#ffc857',
    red: '#ff5d73',
  },
  light: {
    text: '#2a3140',
    dim: '#5b6478',
    faint: '#939cae',
    mint: '#0a8a72',
    blue: '#2b62d9',
    yellow: '#8f6606',
    red: '#c22b47',
  },
} as const;

export type Ink = keyof typeof INKS.dark;
export type Background = keyof typeof INKS;

const ANSI16: Record<Ink, string | null> = {
  text: null,
  dim: '90',
  faint: '90',
  mint: '96',
  blue: '94',
  yellow: '93',
  red: '91',
};

const RESET = '\x1b[0m';

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

export interface Theme {
  depth: number;
  background: Background;
  paint: (text: string, ink?: Ink, opts?: { bold?: boolean }) => string;
  gradient: (text: string, opts?: { bold?: boolean }) => string;
}

export function makeTheme({ depth = 24, background = 'dark' }: { depth?: number; background?: Background } = {}): Theme {
  const inks = INKS[background] || INKS.dark;

  const open = (ink: Ink, bold?: boolean) => {
    if (depth === 0) return '';
    const parts: string[] = [];
    if (bold) parts.push('1');
    if (depth === 24) {
      const [r, g, b] = hexToRgb(inks[ink] || inks.text);
      parts.push(`38;2;${r};${g};${b}`);
    } else if (ANSI16[ink]) {
      parts.push(ANSI16[ink] as string);
    }
    return parts.length ? `\x1b[${parts.join(';')}m` : '';
  };

  const paint: Theme['paint'] = (text, ink = 'text', { bold = false } = {}) => {
    const prefix = open(ink, bold);
    return prefix ? `${prefix}${text}${RESET}` : String(text);
  };

  const gradient: Theme['gradient'] = (text, { bold = false } = {}) => {
    const value = String(text);
    if (depth === 0) return value;
    if (depth !== 24) return paint(value, 'mint', { bold });
    const from = hexToRgb(inks.mint);
    const to = hexToRgb(inks.blue);
    const chars = [...value];
    const steps = Math.max(chars.length - 1, 1);
    return (
      chars
        .map((ch, i) => {
          const t = i / steps;
          const rgb = from.map((f, c) => Math.round(f + (to[c] - f) * t));
          return `\x1b[${bold ? '1;' : ''}38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${ch}`;
        })
        .join('') + RESET
    );
  };

  return { depth, background, paint, gradient };
}
