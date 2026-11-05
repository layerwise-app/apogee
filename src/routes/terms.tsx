import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '~/components/legal/LegalPage';
import { terms } from '~/content/legal';
import { pages } from '~/content/pages';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/terms')({
  head: () =>
    seo({
      title: pages.terms.title,
      description: pages.terms.description,
      path: pages.terms.path,
      image: pages.terms.image,
      imageAlt: pages.terms.imageAlt
    }),
  component: () => <LegalPage label='Legal' {...terms} />
});
