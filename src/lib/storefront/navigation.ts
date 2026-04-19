export interface StorefrontLink {
  label: string;
  href: string;
  external?: boolean;
  enabled?: boolean;
}

const MAIN_HOSTS = new Set(['localhost', '127.0.0.1']);

function normalizeHost(host?: string | null) {
  return (host || '').trim().toLowerCase().split(':')[0];
}

export function isRootStorefrontHost(host?: string | null) {
  const hostOnly = normalizeHost(host);
  if (!hostOnly) return true;
  if (MAIN_HOSTS.has(hostOnly)) return true;
  return hostOnly.endsWith('.vercel.app');
}

export function getStorefrontRoot(subdomain: string, host?: string | null) {
  return isRootStorefrontHost(host) ? `/store/${subdomain}` : '/';
}

export function getStorefrontPath(subdomain: string, path = '/', host?: string | null) {
  const storefrontRoot = getStorefrontRoot(subdomain, host);
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return storefrontRoot === '/' ? normalizedPath || '/' : `${storefrontRoot}${normalizedPath}`;
}

export const DEFAULT_NAVIGATION_LINKS: StorefrontLink[] = [
  { label: 'Home', href: '/', enabled: true },
  { label: 'Products', href: '/products', enabled: true },
  { label: 'Track Order', href: '/track', enabled: true },
  { label: 'Account', href: '/account', enabled: true },
];

export const DEFAULT_FOOTER_LINKS: StorefrontLink[] = [
  { label: 'About', href: '/about', enabled: true },
  { label: 'Privacy', href: '/privacy', enabled: true },
  { label: 'Terms', href: '/terms', enabled: true },
  { label: 'Refunds', href: '/returns', enabled: true },
];

export function normalizeStorefrontLinkHref(href: string) {
  const value = href.trim();
  if (!value) return '';
  if (
    value.startsWith('/') ||
    value.startsWith('#') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    /^https?:\/\//i.test(value)
  ) {
    return value;
  }
  return `/${value.replace(/^\/+/, '')}`;
}

export function resolveStorefrontLinkHref(subdomain: string, href: string) {
  const value = normalizeStorefrontLinkHref(href);
  if (!value) return '';

  if (
    value.startsWith('#') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    /^https?:\/\//i.test(value) ||
    value.startsWith('/store/')
  ) {
    return value;
  }

  if (typeof window !== 'undefined') {
    return getStorefrontPath(subdomain, value, window.location.host);
  }

  return getStorefrontPath(subdomain, value);
}
