import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { equipment } from '@/db/schema';

const SITE_URL = 'https://sonelyx.fr';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await db
    .select({ id: equipment.id, slug: equipment.slug })
    .from(equipment);

  const productUrls: MetadataRoute.Sitemap = items.map((item) => ({
    url: `${SITE_URL}/location/catalogue/${item.slug ?? `location-${item.id}-orleans`}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/location/catalogue`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/location-sono-orleans`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/location-eclairage-loiret`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/realisations`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/cgv`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    ...productUrls,
  ];
}
