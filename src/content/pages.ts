/**
 * Search titles, descriptions, and share-image text for each page. After
 * changing `share`, run `pnpm build:share-images` to redraw the 1200×630
 * images in public/og/.
 */

export type PageMeta = {
  path: string;
  title: string;
  description: string;
  /** Share image, drawn by scripts/build-share-images.mjs. */
  image: string;
  imageAlt: string;
  share: { kicker: string; headline: string };
};

export const pages = {
  home: {
    path: '/',
    title: 'Apogee Orbital: every place on Earth, every day',
    description:
      '48 satellites photograph any place on Earth at 50 cm, up to 12 times a day. Task one over a place you care about and request sample imagery.',
    image: '/og/home.png',
    imageAlt: 'The Apogee constellation orbiting a dotted globe, with live telemetry.',
    share: { kicker: 'Earth observation', headline: 'Every place on Earth. Every day.' }
  },
  imagery: {
    path: '/imagery',
    title: 'Imagery: products and specifications | Apogee Orbital',
    description:
      'Daily monitoring, tasking, archive access, and analytics feeds at 50 cm with eight spectral bands. Specifications and sample captures.',
    image: '/og/imagery.png',
    imageAlt: 'A sample Apogee capture of a container port with a specification readout.',
    share: { kicker: 'Imagery', headline: 'Pictures you can act on.' }
  },
  missions: {
    path: '/missions',
    title: 'Missions: launch history | Apogee Orbital',
    description:
      'Every Apogee Orbital launch from the AO-1 pathfinders to the next scheduled mission, with dates, vehicles, satellites deployed, and status.',
    image: '/og/missions.png',
    imageAlt: 'The Apogee launch history as a mission readout.',
    share: { kicker: 'Missions', headline: 'Every launch, and the next one.' }
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy notice | Apogee Orbital',
    description:
      'What Apogee Orbital collects through this website, why, and how long it keeps it.',
    image: '/og/privacy.png',
    imageAlt: 'Apogee Orbital privacy notice.',
    share: { kicker: 'Legal', headline: 'Privacy notice' }
  },
  terms: {
    path: '/terms',
    title: 'Terms of use | Apogee Orbital',
    description:
      'The terms for using the Apogee Orbital website and the sample imagery it sends.',
    image: '/og/terms.png',
    imageAlt: 'Apogee Orbital terms of use.',
    share: { kicker: 'Legal', headline: 'Terms of use' }
  }
} satisfies Record<string, PageMeta>;

export const notFoundPage = {
  title: 'Signal lost | Apogee Orbital',
  heading: 'Signal lost',
  body: 'This page is out of range. It may have moved, or the link may be wrong.',
  home: 'Return to home'
};
