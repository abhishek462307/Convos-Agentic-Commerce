export function setMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  if (typeof document === 'undefined' || !content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function setFavicon(url: string) {
  if (typeof document === 'undefined' || !url) return;
  let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

export function applyStoreSeo(seo: any, storeName: string) {
  if (typeof document === 'undefined') return;
  
  document.title = seo.meta_title || storeName || 'Store';
  
  const description = seo.meta_description || `Shop at ${storeName}`;
  setMetaTag('description', description);
  if (seo.keywords) setMetaTag('keywords', seo.keywords);
  
  setMetaTag('og:title', seo.meta_title || storeName, 'property');
  setMetaTag('og:description', description, 'property');
  setMetaTag('og:type', 'website', 'property');
  if (seo.og_image) setMetaTag('og:image', seo.og_image, 'property');
  
  setMetaTag('twitter:card', seo.og_image ? 'summary_large_image' : 'summary');
  setMetaTag('twitter:title', seo.meta_title || storeName);
  setMetaTag('twitter:description', description);
  if (seo.og_image) setMetaTag('twitter:image', seo.og_image);
  
  if (seo.favicon_url) {
    setFavicon(seo.favicon_url);
  }
}
