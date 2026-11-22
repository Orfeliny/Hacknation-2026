export const colorTokens = {
  primary: "#004e98",
  "primary-hover": "#3a6ea5",
  ink: "#14202b",
  muted: "#475467",
  border: "#767676",
  "border-strong": "#767676",
  divider: "#c0c0c0",
  "surface-muted": "#ebebeb",
  danger: "#b42318",
  warning: "#b84a00",
  info: "#3a6ea5",
  success: "#1e6b3a",
} as const;

export type ColorToken = keyof typeof colorTokens;

export const textTokens: readonly ColorToken[] = [
  "primary",
  "primary-hover",
  "ink",
  "muted",
  "danger",
  "warning",
  "info",
  "success",
];

export const fontSans = '"Atkinson Hyperlegible Next", system-ui, sans-serif';

function channel(hex: string, start: number): number {
  const c = parseInt(hex.slice(start, start + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * channel(hex, 1) +
    0.7152 * channel(hex, 3) +
    0.0722 * channel(hex, 5)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
