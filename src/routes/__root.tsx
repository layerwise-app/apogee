/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type * as React from 'react';
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary';
import { NotFound } from '~/components/NotFound';
import { SiteFooter } from '~/components/layout/SiteFooter';
import { SiteHeader } from '~/components/layout/SiteHeader';
import { site } from '~/lib/site';
import { fontFaceCss, preloadFonts, themeVars } from '~/lib/theme';
import { notFoundPage } from '~/content/pages';
import { siteConfig } from '~/site.config';
import { seo } from '~/utils/seo';
import appCss from '~/styles/app.css?url';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  // Site-wide defaults; each page's `seo()` overrides tags with the same name.
  // When only the root matched, the URL has no page: that's the 404.
  head: ({ matches }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: siteConfig.colors.background },
      ...(site.googleSiteVerification
        ? [
            {
              name: 'google-site-verification',
              content: site.googleSiteVerification
            }
          ]
        : []),
      ...(matches.length <= 1
        ? seo({ title: notFoundPage.title, noindex: true }).meta
        : seo({ title: site.name, description: site.description }).meta)
    ],
    links: [
      ...preloadFonts.map((href) => ({
        rel: 'preload',
        href,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous' as const
      })),
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' }
    ],
    styles: [{ children: fontFaceCss }]
  }),
  errorComponent: (props) => (
    <RootDocument>
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => <NotFound />,
  component: RootComponent
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' style={themeVars as React.CSSProperties}>
      <head>
        <HeadContent />
      </head>
      <body>
        <SiteHeader />
        <main id='main' tabIndex={-1} className='outline-none'>
          {children}
        </main>
        <SiteFooter />
        <Scripts />
      </body>
    </html>
  );
}
