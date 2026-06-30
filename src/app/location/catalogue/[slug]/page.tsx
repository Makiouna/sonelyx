import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEquipmentBySlug, getEquipmentWithQuantity } from '@/db/queries';
import ProductDetailClient from './product-detail-client';

const SITE_URL = 'https://sonelyx.fr';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getEquipmentBySlug(slug);
  if (!item) return {};

  const specs = JSON.parse(item.specs) as string[];
  const specsStr = specs.slice(0, 3).join(', ');
  const title = `Location ${item.name} Orléans - Matériel Événementiel | Sonelyx`;
  const description = `Louez le ${item.name} ${item.brand} à Orléans pour vos événements. ${item.desc}${specsStr ? ` — ${specsStr}.` : ''} Devis gratuit sous 24h.`;
  const canonical = `${SITE_URL}/location/catalogue/${slug}`;
  const imageUrl = item.image ?? `${SITE_URL}/og-default.jpg`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Sonelyx',
      locale: 'fr_FR',
      type: 'website',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `Location ${item.name} Orléans` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

function buildProductJsonLd(item: NonNullable<Awaited<ReturnType<typeof getEquipmentBySlug>>>) {
  const slug = item.slug ?? `location-${item.id}-orleans`;
  const specs = JSON.parse(item.specs) as string[];

  const base = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description: `${item.desc} Disponible à la location à Orléans (Loiret).`,
    brand: { '@type': 'Brand', name: item.brand },
    category: item.catLabel,
    url: `${SITE_URL}/location/catalogue/${slug}`,
    ...(item.image && { image: item.image }),
    ...(specs.length > 0 && { additionalProperty: specs.map(s => ({ '@type': 'PropertyValue', value: s })) }),
    offers: item.priceType === 'on_request'
      ? {
          '@type': 'Offer',
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          areaServed: { '@type': 'City', name: 'Orléans' },
          description: 'Prix sur devis',
        }
      : {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: 'EUR',
          priceSpecification: { '@type': 'UnitPriceSpecification', price: item.price, priceCurrency: 'EUR', unitText: 'jour' },
          availability: item.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          areaServed: { '@type': 'City', name: 'Orléans' },
          seller: { '@type': 'Organization', name: 'Sonelyx' },
        },
  };

  return base;
}

export default async function ProductSlugPage({ params }: Props) {
  const { slug } = await params;
  const item = await getEquipmentBySlug(slug);
  if (!item) notFound();

  const allItems = await getEquipmentWithQuantity();
  const similarItems = allItems
    .filter(x => x.cat === item.cat && x.id !== item.id)
    .slice(0, 3)
    .map(x => ({
      ...x,
      specs: JSON.parse(x.specs) as string[],
      slug: x.slug ?? `location-${x.id}-orleans`,
      priceType: x.priceType as 'numeric' | 'on_request',
      priceTax: x.priceTax as 'HT' | 'TTC',
    }));

  const parsedItem = {
    ...item,
    specs: JSON.parse(item.specs) as string[],
    slug: item.slug ?? `location-${item.id}-orleans`,
    priceType: item.priceType as 'numeric' | 'on_request',
    priceTax: item.priceTax as 'HT' | 'TTC',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(item)) }}
      />
      <ProductDetailClient item={parsedItem} similarItems={similarItems} />
    </>
  );
}
