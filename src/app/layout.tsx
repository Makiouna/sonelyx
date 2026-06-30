import type { Metadata } from "next";
import { Hanken_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sonelyx - Prestation technique & location événementielle à Orléans",
  description: "Direction technique, sound & light design et location de matériel événementiel professionnel à Orléans (Loiret, 45). Devis gratuit sous 24h.",
  alternates: { canonical: "https://sonelyx.fr" },
  openGraph: {
    title: "Sonelyx - Location matériel événementiel Orléans",
    description: "Location de matériel son, lumière et structure pour vos événements à Orléans et dans le Loiret.",
    url: "https://sonelyx.fr",
    siteName: "Sonelyx",
    locale: "fr_FR",
    type: "website",
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Sonelyx",
  description: "Prestation technique événementielle et location de matériel son, lumière et structure à Orléans (Loiret).",
  url: "https://sonelyx.fr",
  logo: "https://sonelyx.fr/logo.png",
  image: "https://sonelyx.fr/og-default.jpg",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Orléans",
    addressRegion: "Loiret",
    postalCode: "45000",
    addressCountry: "FR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 47.9029,
    longitude: 1.9093,
  },
  areaServed: [
    { "@type": "City", name: "Orléans" },
    { "@type": "AdministrativeArea", name: "Loiret" },
    { "@type": "AdministrativeArea", name: "Centre-Val de Loire" },
  ],
  serviceType: ["Location matériel événementiel", "Direction technique", "Son & Lumière"],
  priceRange: "€€",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${hankenGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
