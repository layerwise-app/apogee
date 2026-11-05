/**
 * Site-wide settings: names, navigation, call-to-action labels, colors, fonts,
 * and where form notifications go. Page copy lives in src/content/.
 */

export type NavLink = { label: string; href: string };

export const siteConfig = {
  company: 'Apogee Orbital',
  product: 'Apogee',
  tagline: 'Every place on Earth, photographed every day.',
  description:
    'Apogee Orbital flies 48 satellites that photograph any place on Earth at 50 cm resolution, up to 12 times a day.',
  offices: ['Toulouse', 'Denver'],
  founded: 2021,

  /**
   * Where "Request sample imagery" submissions are emailed, like
   * "samples@yourcompany.com". Empty sends no email; submissions are always
   * saved to the database (the project's Database panel in Layerwise).
   */
  ownerEmail: '',

  /** Header links. Paths with "#" jump to a section of the home page. */
  nav: [
    { label: 'Tasking', href: '/#tasking' },
    { label: 'Imagery', href: '/imagery' },
    { label: 'Constellation', href: '/#constellation' },
    { label: 'Missions', href: '/missions' }
  ] satisfies NavLink[],

  /** Every button that asks the visitor to act leads to the sign-up form. */
  cta: {
    label: 'Request sample imagery',
    /** Shorter label for the header on phones. */
    shortLabel: 'Request samples',
    href: '/#request'
  },

  footerLinks: [
    { label: 'Imagery', href: '/imagery' },
    { label: 'Missions', href: '/missions' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' }
  ] satisfies NavLink[],

  /** Social profiles shown in the footer, like { label: 'LinkedIn', href: 'https://…' }. */
  social: [] as NavLink[],

  /**
   * Colors used across the site. `accent` marks live values and alerts only;
   * keep it rare. Text colors must keep 4.5:1 contrast on `background`.
   */
  colors: {
    background: '#05070b',
    surface: '#0a0f17',
    raised: '#0f1622',
    line: 'rgba(164, 186, 214, 0.16)',
    lineStrong: 'rgba(196, 214, 238, 0.36)',
    text: '#eef2f7',
    muted: '#93a0b2',
    accent: '#ffb547',
    danger: '#ff7a6b'
  },

  /**
   * Self-hosted fonts in public/fonts/ (SIL Open Font License). To change a
   * font, add its .woff2 file there and update the entry here.
   */
  fonts: {
    display: {
      family: 'Archivo',
      file: '/fonts/archivo-variable-latin.woff2',
      weight: '100 900',
      stretch: '62% 125%',
      /** Condensed width used for headlines. */
      displayStretch: '64%'
    },
    body: {
      family: 'Archivo',
      file: '/fonts/archivo-variable-latin.woff2',
      weight: '100 900',
      stretch: '62% 125%'
    },
    mono: [
      {
        family: 'IBM Plex Mono',
        file: '/fonts/ibm-plex-mono-400-latin.woff2',
        weight: '400'
      },
      {
        family: 'IBM Plex Mono',
        file: '/fonts/ibm-plex-mono-500-latin.woff2',
        weight: '500'
      }
    ]
  }
};

export type SiteConfig = typeof siteConfig;
