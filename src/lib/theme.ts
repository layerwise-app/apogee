import { siteConfig } from '~/site.config';

const { colors, fonts } = siteConfig;

/** CSS variables for <html>, from site.config.ts. */
export const themeVars = {
  '--apg-bg': colors.background,
  '--apg-surface': colors.surface,
  '--apg-raised': colors.raised,
  '--apg-line': colors.line,
  '--apg-line-strong': colors.lineStrong,
  '--apg-text': colors.text,
  '--apg-muted': colors.muted,
  '--apg-accent': colors.accent,
  '--apg-danger': colors.danger,
  '--apg-font-display': `'${fonts.display.family}', 'Arial Narrow', sans-serif`,
  '--apg-font-body': `'${fonts.body.family}', system-ui, sans-serif`,
  '--apg-font-mono': `'${fonts.mono[0].family}', ui-monospace, Menlo, monospace`,
  '--apg-display-stretch': fonts.display.displayStretch
} as Record<string, string>;

type FontEntry = { family: string; file: string; weight: string; stretch?: string };

const fontList: FontEntry[] = [fonts.display, fonts.body, ...fonts.mono];

/** @font-face rules for every configured font file. */
export const fontFaceCss = Array.from(
  new Map(fontList.map((f) => [`${f.family}|${f.file}`, f])).values()
)
  .map(
    (f) =>
      `@font-face{font-family:'${f.family}';src:url(${f.file}) format('woff2');font-weight:${f.weight};${
        f.stretch ? `font-stretch:${f.stretch};` : ''
      }font-style:normal;font-display:optional}`
  )
  .join('');

/** Font files to preload so text renders in its final face at first paint. */
export const preloadFonts = Array.from(
  new Set([fonts.display.file, fonts.body.file, fonts.mono[0].file])
);
