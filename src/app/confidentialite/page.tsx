'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';

export default function Confidentialite() {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, padding: 'clamp(40px, 8vw, 80px) clamp(20px, 4vw, 40px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '48px', borderBottom: '1px solid rgba(0,0,0,.08)', paddingBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidentialité</span>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-.02em', marginTop: '8px', marginBottom: '0', color: '#1d1d1f' }}>
              Politique de Confidentialité
            </h1>
            <p style={{ color: '#6e6e73', fontSize: '15px', marginTop: '12px' }}>En vigueur au 1er juillet 2026</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.6, fontSize: '16px', color: '#1d1d1f' }}>
            
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                1. Introduction
              </h2>
              <p style={{ margin: '0' }}>
                La société Sonelyx attache une grande importance à la protection et à la confidentialité de vos données personnelles. La présente politique décrit comment nous collectons, utilisons et protégeons vos informations personnelles lorsque vous utilisez notre site internet <a href="https://sonelyx.fr" style={{ color: '#0071e3', textDecoration: 'none' }}>https://sonelyx.fr</a>, conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                2. Responsable du traitement
              </h2>
              <p style={{ margin: '0' }}>
                Les données à caractère personnel collectées sur ce site sont traitées par la société Sonelyx, SAS au capital de 5 000 €, dont le siège social est situé à Orléans, France, représentée par son gérant en exercice. Vous pouvez nous contacter par e-mail à <a href="mailto:contact@sonelyx.fr" style={{ color: '#0071e3', textDecoration: 'none' }}>contact@sonelyx.fr</a>.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                3. Données personnelles collectées
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Nous collectons et traitons les données que vous nous fournissez volontairement via les formulaires du site, notamment :
              </p>
              <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Données d'identification :</strong> Nom, prénom, civilité.</li>
                <li><strong>Données de contact :</strong> Adresse e-mail, numéro de téléphone, adresse postale.</li>
                <li><strong>Données relatives au devis :</strong> Liste du matériel sélectionné, type d'événement, date et lieu de l'événement.</li>
                <li><strong>Données de connexion :</strong> Identifiants de connexion chiffrés (compte client).</li>
              </ul>
              <p style={{ margin: '0' }}>
                Certaines données de navigation sont également collectées de façon automatique pour améliorer l'expérience utilisateur et à des fins d'analyse statistique de fréquentation.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                4. Finalités du traitement des données
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                La collecte et le traitement de vos données personnelles ont pour finalités principales :
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>La gestion de la relation client (réponse aux demandes de contact, traitement des paniers et création des devis).</li>
                <li>L'organisation, le suivi et la facturation des prestations techniques ou locations réservées.</li>
                <li>L'accès et la gestion de votre espace client personnel.</li>
                <li>L'envoi d'informations relatives aux services Sonelyx (si accord préalable).</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                5. Destinataires et transfert des données
              </h2>
              <p style={{ margin: '0' }}>
                Vos données sont uniquement destinées aux services internes habilités de Sonelyx. Elles ne sont en aucun cas vendues, louées ou cédées à des tiers à des fins commerciales ou publicitaires.
                Vos données peuvent être transmises à des prestataires techniques tiers (par exemple notre outil de gestion de devis/base de données ou de paiement en ligne Stripe le cas échéant) dans la stricte limite de ce qui est nécessaire à la réalisation des services.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                6. Durée de conservation des données
              </h2>
              <p style={{ margin: '0' }}>
                Les données des clients sont conservées pendant toute la durée de la relation contractuelle, puis archivées conformément aux durées de prescription légales (notamment 10 ans pour les factures). Les données de prospection commerciale (demandes de devis sans suite) sont conservées pendant une durée maximale de 3 ans à compter du dernier contact émanant de votre part.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                7. Vos droits (RGPD)
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Conformément aux réglementations applicables, vous disposez des droits suivants concernant vos données personnelles :
              </p>
              <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Droit d'accès :</strong> Obtenir la confirmation que vos données sont traitées ou non.</li>
                <li><strong>Droit de rectification :</strong> Demander la correction d'informations inexactes ou incomplètes.</li>
                <li><strong>Droit d'effacement (« droit à l'oubli ») :</strong> Demander la suppression de vos données personnelles sous certaines conditions.</li>
                <li><strong>Droit de limitation :</strong> Suspendre temporairement le traitement de vos données.</li>
                <li><strong>Droit d'opposition :</strong> Vous opposer à tout moment au traitement de vos données pour des motifs légitimes ou à des fins de prospection.</li>
              </ul>
              <p style={{ margin: '0' }}>
                Pour exercer ces droits, il vous suffit de nous adresser une demande écrite à l'adresse e-mail : <a href="mailto:contact@sonelyx.fr" style={{ color: '#0071e3', textDecoration: 'none' }}>contact@sonelyx.fr</a>. Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation auprès de la CNIL (cnil.fr).
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
