import { use } from 'react';
import { StorefrontInfoPage } from '../../components/StorefrontInfoPage';

export default function CustomFooterPage({
  params,
}: {
  params: Promise<{ subdomain: string; slug: string }>;
}) {
  const { subdomain, slug } = use(params);

  return <StorefrontInfoPage subdomain={subdomain} variant="custom" slug={slug} />;
}
