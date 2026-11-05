import { Link } from '@tanstack/react-router';
import type * as React from 'react';

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
};

/**
 * One link component for every href in the content files: "/imagery" and
 * "/#tasking" use the router, "#tasking" stays on the page, and "https://…"
 * opens in a new tab.
 */
export function SmartLink({ href, children, ...rest }: Props) {
  if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
    return (
      <a href={href} target='_blank' rel='noopener noreferrer' {...rest}>
        {children}
      </a>
    );
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  const [path, hash] = href.split('#');
  return (
    <Link to={path || '/'} hash={hash || undefined} {...rest}>
      {children}
    </Link>
  );
}
