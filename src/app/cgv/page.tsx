'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';

export default function CGV() {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, padding: 'clamp(40px, 8vw, 80px) clamp(20px, 4vw, 40px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '48px', borderBottom: '1px solid rgba(0,0,0,.08)', paddingBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conditions</span>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-.02em', marginTop: '8px', marginBottom: '0', color: '#1d1d1f' }}>
              Conditions Générales de Vente &amp; Location
            </h1>
            <p style={{ color: '#6e6e73', fontSize: '15px', marginTop: '12px' }}>En vigueur au 1er juillet 2026</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.6, fontSize: '16px', color: '#1d1d1f' }}>
            
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                1. Objet et champ d'application
              </h2>
              <p style={{ margin: '0' }}>
                Les présentes Conditions Générales de Vente (CGV) s'appliquent sans restriction ni réserve à l'ensemble des locations de matériel (son, éclairage, structure, vidéo, énergie) et prestations techniques associées proposées par la société Sonelyx à ses clients professionnels et particuliers. Le fait de passer commande implique l'acceptation entière et sans réserve du client à ces CGV.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                2. Devis, commande et réservation
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Toute demande donne lieu à l'établissement d'un devis gratuit d'une validité de 30 jours, sauf mention contraire. La commande n'est considérée comme ferme et définitive qu'après :
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Le retour du devis dûment signé avec la mention « Bon pour accord ».</li>
                <li>Le versement d'un acompte égal à 30 % du montant total du devis.</li>
                <li>L'acceptation expresse des présentes CGV.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                3. Tarifs et modalités de paiement
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Les prix sont indiqués en Euros, Hors Taxes (HT) et/ou Toutes Taxes Comprises (TTC) selon le statut du client. Le solde du paiement doit être réglé au plus tard le jour du retrait ou de la livraison du matériel, sauf conditions particulières accordées par écrit.
              </p>
              <p style={{ margin: '0' }}>
                Tout retard de paiement entraînera l'application de pénalités de retard égales au taux d'intérêt appliqué par la Banque Centrale Européenne à son opération de refinancement la plus récente majoré de 10 points de pourcentage, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € pour les professionnels.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                4. Dépôt de garantie (Caution)
              </h2>
              <p style={{ margin: '0' }}>
                Pour toute location de matériel sans encadrement par un technicien Sonelyx, un dépôt de garantie sous forme de chèque ou d'empreinte bancaire sera exigé avant le retrait du matériel. Le montant est défini en fonction de la valeur à neuf du matériel loué. Ce dépôt n'est pas encaissé et sera restitué après vérification complète du matériel au retour (sous un délai maximal de 7 jours ouvrés), déduction faite des éventuels frais de remise en état ou matériel manquant.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                5. Mise à disposition, réception et retour du matériel
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Le transfert des risques s'opère dès la mise à disposition du matériel au locataire. Le locataire reconnaît avoir reçu le matériel en bon état de fonctionnement, propre et complet.
              </p>
              <p style={{ margin: '0' }}>
                Le matériel doit être restitué propre et conditionné dans ses housses ou fly-cases d'origine aux date et heure convenues dans le contrat. Tout retard de restitution fera l'objet d'une facturation complémentaire basée sur le tarif journalier en vigueur. Toute détérioration, perte ou vol du matériel sera facturé au client sur la base de sa valeur de remplacement à neuf.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                6. Responsabilité et Assurances
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Le locataire assume l'entière responsabilité du matériel dès sa prise de possession. Il s'engage à l'utiliser conformément à sa destination et aux règles de l'art, et à ne pas le sous-louer ni le céder.
              </p>
              <p style={{ margin: '0' }}>
                Le locataire doit souscrire une assurance responsabilité civile couvrant l'utilisation du matériel ainsi qu'une assurance couvrant le vol, les dommages et les pertes pour toute la durée de la location.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                7. Droit applicable et juridiction
              </h2>
              <p style={{ margin: '0' }}>
                Toutes les clauses figurant dans les présentes CGV ainsi que toutes les opérations de vente et de location qui y sont visées sont soumises au droit français. En cas de contestation ou litige relatif à l'interprétation ou à l'exécution du contrat, et à défaut d'accord amiable, le Tribunal de Commerce d'Orléans sera seul compétent.
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
