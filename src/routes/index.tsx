import { createFileRoute } from '@tanstack/react-router';
import { ConstellationSection } from '~/components/home/ConstellationSection';
import { Hero } from '~/components/home/Hero';
import { IndustriesSection } from '~/components/home/IndustriesSection';
import { MissionsSection } from '~/components/home/MissionsSection';
import { RequestSection } from '~/components/home/RequestSection';
import { TaskingSection } from '~/components/home/TaskingSection';
import { pages } from '~/content/pages';
import { siteUrl } from '~/lib/site';
import { siteConfig } from '~/site.config';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  head: () =>
    seo({
      title: pages.home.title,
      description: pages.home.description,
      path: pages.home.path,
      image: pages.home.image,
      imageAlt: pages.home.imageAlt,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: siteConfig.company,
          url: siteUrl('/'),
          logo: siteUrl('/logo.png'),
          description: siteConfig.description,
          foundingDate: String(siteConfig.founded),
          address: siteConfig.offices.map((city) => ({ '@type': 'PostalAddress', addressLocality: city })),
          ...(siteConfig.social.length ? { sameAs: siteConfig.social.map((s) => s.href) } : {})
        },
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: `${siteConfig.product} Tasking`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description:
            'Task a satellite over any place on Earth and receive 50 cm, eight-band imagery under 90 minutes after capture.',
          url: siteUrl('/imagery'),
          publisher: { '@type': 'Organization', name: siteConfig.company },
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free sample imagery on request',
            url: siteUrl('/#request')
          }
        }
      ]
    }),
  component: Home
});

function Home() {
  return (
    <>
      <Hero />
      <TaskingSection />
      <IndustriesSection />
      <ConstellationSection />
      <MissionsSection />
      <RequestSection />
    </>
  );
}
