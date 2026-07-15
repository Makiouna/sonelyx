import type { Metadata } from 'next';
import Header from '@/components/header';
import Footer from '@/components/footer';

const SITE_URL = 'https://sonelyx.fr';

export const metadata: Metadata = {
  title: 'Mentions Légales | Sonelyx',
  description: 'Mentions légales du site Sonelyx : identité de l\'éditeur, hébergement, propriété intellectuelle et informations légales sur la location de matériel événementiel à Orléans.',
  alternates: { canonical: `${SITE_URL}/mentions-legales` },
};

export default function MentionsLegales() {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, padding: 'clamp(40px, 8vw, 80px) clamp(20px, 4vw, 40px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '48px', borderBottom: '1px solid rgba(0,0,0,.08)', paddingBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Réglementation</span>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-.02em', marginTop: '8px', marginBottom: '0', color: '#1d1d1f' }}>
              Mentions Légales
            </h1>
            <p style={{ color: '#6e6e73', fontSize: '15px', marginTop: '12px' }}>En vigueur au 1er juillet 2026</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.6, fontSize: '16px', color: '#1d1d1f' }}>
            
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                1. Éditeur du site
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Le présent site internet, accessible à l'adresse <a href="https://sonelyx.fr" style={{ color: '#0071e3', textDecoration: 'none' }}>https://sonelyx.fr</a>, est édité par la société <strong>Sonelyx</strong>.
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Forme juridique :</strong> SAS (Société par Actions Simplifiée) au capital de 5 000 €</li>
                <li><strong>Siège social :</strong> 45000 Orléans, France</li>
                <li><strong>RCS :</strong> Orléans B 123 456 789</li>
                <li><strong>SIRET :</strong> 123 456 789 00018</li>
                <li><strong>TVA Intracommunautaire :</strong> FR 99 123456789</li>
                <li><strong>Adresse électronique :</strong> <a href="mailto:contact@sonelyx.fr" style={{ color: '#0071e3', textDecoration: 'none' }}>contact@sonelyx.fr</a></li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                2. Directeur de la publication
              </h2>
              <p style={{ margin: '0' }}>
                Le directeur de la publication du site internet est le représentant légal de la société Sonelyx.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                3. Hébergement du site
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Le site internet est hébergé par la société <strong>Vercel Inc.</strong> :
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Raison sociale :</strong> Vercel Inc.</li>
                <li><strong>Adresse :</strong> 340 S Lemon Ave #9584 Walnut, CA 91789, États-Unis</li>
                <li><strong>Site internet :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0071e3', textDecoration: 'none' }}>https://vercel.com</a></li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                4. Propriété intellectuelle
              </h2>
              <p style={{ margin: '0' }}>
                L'ensemble du contenu présent sur ce site, incluant de façon non limitative les graphismes, images, textes, vidéos, animations, sons, logos, gifs et icônes ainsi que leur mise en forme, sont la propriété exclusive de la société Sonelyx, à l'exception des marques, logos ou contenus appartenant à d'autres sociétés partenaires ou auteurs.
                Toute reproduction, distribution, modification, adaptation, retransmission ou publication, même partielle, de ces différents éléments est strictement interdite sans l'accord exprès par écrit de Sonelyx.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                5. Limitation de responsabilité
              </h2>
              <p style={{ margin: '0' }}>
                Les informations contenues sur ce site sont aussi précises que possible et le site est périodiquement remis à jour, mais peut toutefois contenir des inexactitudes, des omissions ou des lacunes. Si vous constatez une lacune, erreur ou ce qui parait être un dysfonctionnement, merci de bien vouloir le signaler par courriel à l'adresse contact@sonelyx.fr en décrivant le problème de la manière la plus précise possible.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                6. Contactez-nous
              </h2>
              <p style={{ margin: '0' }}>
                Pour toute question ou demande d'information concernant le site, ou tout signalement de contenu ou d'activités illicites, vous pouvez nous contacter à l'adresse électronique <a href="mailto:contact@sonelyx.fr" style={{ color: '#0071e3', textDecoration: 'none' }}>contact@sonelyx.fr</a>.
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
