import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '~/components/legal/LegalPage';
import { privacy } from '~/content/legal';
import { pages } from '~/content/pages';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/privacy')({
  head: () =>
    seo({
      title: pages.privacy.title,
      description: pages.privacy.description,
      path: pages.privacy.path,
      image: pages.privacy.image,
      imageAlt: pages.privacy.imageAlt
    }),
  component: () => <LegalPage label='Legal' {...privacy} />
});
