import { use } from 'react';
import { StorefrontInfoPage } from '../components/StorefrontInfoPage';

export default function ContactPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = use(params);

  return <StorefrontInfoPage subdomain={subdomain} variant="contact" />;
}
