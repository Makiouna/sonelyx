import type { MetadataRoute } from 'next';

const SITE_URL = 'https://sonelyx.fr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dashboard/', '/api/', '/auth/', '/espace-client/', '/profil/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
