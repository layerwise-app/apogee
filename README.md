<a href="https://layerwise.app"><img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="320" /></a>

# Apogee

A landing-page template for **Apogee Orbital**, a fictional Earth-observation
company: 140 people in Toulouse and Denver, 48 satellites in three orbital
planes at 525 km, 50 cm resolution, eight spectral bands, and up to 12
revisits a day.

Everything moving on the site runs on a real orbit model
(`src/lib/orbits.ts`, with tests). The hero globe and the tasking demo are
drawn in WebGL; the captures are painted on a canvas from the same seeds every
time; the mission timeline is drawn in 2D wireframe. Nothing is a stock video.

Pages:

| Path             | What's there                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `/`              | Hero globe with live telemetry, tasking demo, who uses it, constellation timeline, next launch, request form |
| `/imagery`       | Products, specification table, gallery of every site's capture                                 |
| `/missions`      | Launch history table                                                                            |
| `/privacy`       | Privacy notice                                                                                  |
| `/terms`         | Terms of use                                                                                    |
| anything else    | "Signal lost" 404                                                                               |

Built with TanStack Start, React, Tailwind CSS, Cloudflare Workers, and a D1
database through Drizzle. Layerwise runs the dev server.

## Commands

```bash
pnpm check-types          # TypeScript
pnpm lint                 # oxlint
pnpm test                 # vitest: orbit model and form rules
pnpm build                # type check and production build

pnpm add-images <files>   # add photos or screenshots (see "Replace a screen")
pnpm build:share-images   # redraw the 1200×630 link-preview images in public/og/
pnpm build:icons          # redraw favicons and app icons from public/logo.svg
pnpm build:earth          # rebuild the land dots and globe still from Natural Earth

pnpm db:generate --name <change>   # after editing src/db/schema.ts
pnpm db:migrate                    # apply migrations to the local database
```

`build:share-images` uses headless Chrome through Playwright. The `build:` scripts
read the TypeScript config directly, which needs Node 23.6 or newer.

## Rewrite the copy

All words on the site live in a few typed files. Change them there, not in
components.

| File                    | What it holds                                                                 |
| ----------------------- | ----------------------------------------------------------------------------- |
| `src/site.config.ts`    | Company and product names, navigation, call-to-action labels, footer links, social links, colors, fonts, `ownerEmail` |
| `src/content/home.ts`   | Every home section: hero, tasking, industries, constellation, missions, request form messages |
| `src/content/imagery.ts`| Imagery page: intro, products, specification rows, gallery intro             |
| `src/content/pages.ts`  | Search title, description, and share-image text for each page, and the 404   |
| `src/content/legal.ts`  | Privacy notice and terms                                                      |
| `src/content/constellation.ts` | Orbit parameters: altitude, planes, ground stations, demo speed        |
| `src/content/sites/`    | One file per preset site                                                      |
| `src/content/missions/` | One file per launch                                                           |

Titles under about 60 characters and descriptions under about 160 read best in
search results. After changing `share` text in `pages.ts`, run
`pnpm build:share-images`.

## Add an item

Launches and preset sites grow over time, so each one is its own file. Copy a
file, change the values, and the rest of the site picks it up: there is no
list to update.

**A launch.** Copy `src/content/missions/ao-6.ts` to `ao-7.ts` and edit it.
`status` is `scheduled`, `operational`, `retired`, or `failed`; `launchAt` is
UTC in ISO 8601. The Missions table, its counts and structured data, and the
home page's "Next launch" (the earliest `scheduled` one) update on their own.

**A preset site.** Copy a file in `src/content/sites/`, give it a new `id`
(also the file name), `order`, coordinates, and one of the six scene kinds
(`delta`, `vineyard`, `port`, `burn`, `mine`, `city`). Change `seed` to get a
different picture of the same kind of place. It appears in the tasking list,
the Imagery gallery, and its capture gets a screen id, `capture-<id>`.

## Replace a screen

Each drawn screen sits in a slot (`src/components/Screen.tsx`) that can show
an image or video instead, in the same box:

| Screen id                | Where                                              |
| ------------------------ | -------------------------------------------------- |
| `hero-globe`             | Home hero globe                                    |
| `tasking-console`        | Home tasking demo                                  |
| `constellation-timeline` | Home launch-to-first-light sequence                |
| `capture-<site id>`      | That site's capture in the gallery and industry crops |

1. Add the image: `pnpm add-images ~/Desktop/tasking.png`. It writes WebP
   files 800, 1600, and 2880 px wide (never wider than the original) to
   `public/images/`, and records the size and a blurred placeholder in
   `src/content/images.json` under the file's name (`tasking`). GIFs are
   copied untouched; SVGs are refused.
2. Point the screen at it in `src/content/screens.ts`:

   ```ts
   export const screens: Partial<Record<ScreenId, ScreenOverride>> = {
     'tasking-console': { type: 'image', image: 'tasking', alt: 'The tasking console in Apogee' }
   };
   ```

   For a video, put an `.mp4` in `public/videos/` and use
   `{ type: 'video', src: '/videos/tour.mp4', poster: 'tour-poster', alt: '…' }`.
   Videos don't autoplay for visitors who ask for reduced motion.

Remove the entry to bring the drawn screen back.

## Fonts and colors

Both are in `src/site.config.ts`.

- **Colors.** `accent` (amber) is for live values and alerts only. Text colors
  need 4.5:1 contrast on `background`; the defaults pass.
- **Fonts.** Self-hosted in `public/fonts/`, preloaded, and declared from the
  config. To change one, add its `.woff2` file there and update the `file`,
  `family`, `weight`, and (for variable fonts) `stretch` entries. Then rerun
  `pnpm build:share-images` so link previews match.

Included fonts, both under the SIL Open Font License 1.1 (license texts in
`public/fonts/`):

- [Archivo](https://github.com/Omnibus-Type/Archivo) by Omnibus-Type: headlines
  (condensed width) and body text.
- [IBM Plex Mono](https://github.com/IBM/plex) by IBM: labels and readouts.

## Form notifications: `ownerEmail`

The request form saves every request. To also get an email for each new one,
set `ownerEmail` in `src/site.config.ts`:

```ts
ownerEmail: 'sales@your-company.com',
```

- Only that address is ever emailed. Visitors never get email from the site.
- At most 100 notifications a day; requests past that are still saved. Your
  Layerwise plan's daily email limit also applies.
- Email is sent after the site is first published. In the local preview,
  notifications appear under **Email → Local** in Layerwise instead of being
  sent.

## Where submissions show up

Open **Database** in Layerwise and choose the `sample_requests` table: work
email, organization, area of interest, use case, the time, and whether you
were emailed. **Local** shows requests from the preview; **Production** shows
the published site's.

The form checks every field on the server, ignores bots that fill a hidden
field, and allows five requests per visitor per hour. A second request from the
same email shows "already on the list" and adds no row. Visitors are counted
in `form_attempts` by a salted hash of their IP address (the salt is generated
on first use and kept in `app_secrets`); raw IP addresses are never stored,
and attempts older than a day are deleted.

## Search and sharing

Every page sets its own title, description, canonical URL, and 1200×630 share
image (`public/og/`). The home page adds Organization and SoftwareApplication
structured data. `/sitemap.xml` lists the paths in `sitemapPaths` in
`src/lib/site.ts`; add new public pages there. After connecting a custom
domain, set `site.url` in the same file.

## Motion and performance

- The headline and call to action are in the server-rendered HTML. The globe,
  captures, and timeline load after first paint, with a still image in their
  place until then.
- Canvases pause when they scroll out of view or the tab is hidden.
- With reduced motion, the globe stops spinning, the tasking demo jumps
  straight to the delivered capture, and the timeline shows finished stills.
- On phones, the timeline is a list with stills; nothing takes over scrolling.

## Credits

- Land outlines: [Natural Earth](https://www.naturalearthdata.com/) (public
  domain). Made with Natural Earth. `pnpm build:earth` downloads
  `ne_50m_land` and `ne_110m_land` and turns them into the globe's dots
  (`src/lib/earth/land-data.ts`) and the still image (`public/globe-still.svg`).
- The sun position uses the low-precision formula from the
  _Astronomical Almanac_ (accurate to about 0.01°).
- Apogee Orbital, its customers, and everyone named on the site are fictional.
