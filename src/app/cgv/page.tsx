import type { Metadata } from 'next';
import Header from '@/components/header';
import Footer from '@/components/footer';

const SITE_URL = 'https://sonelyx.fr';

export const metadata: Metadata = {
  title: 'Conditions Générales de Location | Sonelyx',
  description: 'Conditions Générales de Location en Ligne (CGL) de Sonelyx : modalités de réservation, livraison, garantie et responsabilité pour la location de matériel événementiel à Orléans.',
  alternates: { canonical: `${SITE_URL}/cgv` },
};

export default function CGV() {
  return (
    <div style={{ backgroundColor: '#ffffff', color: '#1d1d1f', fontFamily: 'var(--font-hanken-grotesk), sans-serif', WebkitFontSmoothing: 'antialiased', letterSpacing: '-.01em', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, padding: 'clamp(40px, 8vw, 80px) clamp(20px, 4vw, 40px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          <div style={{ marginBottom: '48px', borderBottom: '1px solid rgba(0,0,0,.08)', paddingBottom: '24px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conditions</span>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-.02em', marginTop: '8px', marginBottom: '0', color: '#1d1d1f' }}>
              Conditions Générales de Location en Ligne (CGL)
            </h1>
            <p style={{ color: '#6e6e73', fontSize: '15px', marginTop: '12px' }}>En vigueur au 1er juillet 2026</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', lineHeight: 1.6, fontSize: '16px', color: '#1d1d1f' }}>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Préambule
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Les présentes Conditions Générales de Location (ci-après « CGL ») régissent les relations contractuelles entre :
              </p>
              <p style={{ margin: '0 0 12px' }}>
                D'une part, le loueur, agissant pour le compte de la société SONELYX, Société par Actions Simplifiée Unipersonnelle (SASU) en cours de formation au capital social de 100 €, dont le siège est situé à Orléans (RCS d'Orléans en cours d'immatriculation).
              </p>
              <p style={{ margin: '0 0 12px' }}>
                Et d'autre part, toute personne physique ou morale (ci-après « le Client ») procédant à une réservation de matériel via le site internet de SONELYX.
              </p>
              <p style={{ margin: '0' }}>
                Le Client reconnaît avoir pris connaissance des présentes CGL préalablement à la validation de sa commande. Le Client est qualifié de « Professionnel » s'il agit dans le cadre de son activité commerciale, ou de « Consommateur » s'il agit à des fins non professionnelles.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 1 – Objet
              </h2>
              <p style={{ margin: '0' }}>
                Le présent contrat définit les conditions de location simple de matériel événementiel et audiovisuel (sans installation ni technicien). Le matériel demeure la propriété inaliénable de SONELYX.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 2 – Commande et Validation
              </h2>
              <p style={{ margin: '0' }}>
                La commande est ferme et définitive après validation du paiement en ligne et fourniture des pièces justificatives demandées. SONELYX se réserve le droit d'annuler une commande en cas d'indisponibilité fortuite du matériel. Dans ce cas, le Client sera intégralement remboursé des sommes versées, sans pénalité.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 3 – Tarification et Paiement
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Les prix sont indiqués en euros (TTC pour les Consommateurs, HT et TTC pour les Professionnels). Le paiement s'effectue comptant lors de la réservation en ligne.
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Pour les Clients Professionnels : en cas de retard de paiement (facturation additionnelle post-location), des pénalités au taux légal majoré de 10 points et une indemnité forfaitaire de recouvrement de 40 € s'appliquent de plein droit.</li>
                <li>Pour les Clients Consommateurs : en cas de retard de paiement, les sommes dues porteront intérêt au taux légal en vigueur, sans indemnité forfaitaire supplémentaire.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 4 – Dépôt de Garantie (Caution)
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Un dépôt de garantie (par empreinte bancaire) est obligatoire. Il n'est pas encaissé lors de la commande.
              </p>
              <p style={{ margin: '0' }}>
                En cas de dégradation, casse, perte, vol ou retard de restitution, un état des lieux contradictoire sera dressé avec le Client (ou notifié par écrit avec preuves photographiques s'il est absent). Le Client autorise expressément SONELYX à prélever sur la caution le montant des réparations sur présentation d'une facture de remise en état ou de remplacement à neuf, ou les pénalités de retard. Si le préjudice dépasse le montant de la caution, le Client reste redevable du solde.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 5 – Droit de Rétractation (Clients Consommateurs)
              </h2>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li><strong>Principe :</strong> conformément à l'article L. 221-18 du Code de la consommation, le Client Consommateur dispose d'un délai de 14 jours à compter de la validation de sa commande pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.</li>
                <li><strong>Exception et renonciation :</strong> si la date de début de location intervient avant la fin du délai de 14 jours, le Client demande expressément à ce que l'exécution du service commence avant la fin du délai de rétractation et renonce expressément à son droit de rétractation (Art. L. 221-28 1° et 12° du Code de la consommation).</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 6 – Annulation de la Commande
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                En dehors du droit de rétractation légal applicable aux Consommateurs, toute annulation est soumise au barème suivant :
              </p>
              <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Annulation à plus de 15 jours : retenue de 30 % du montant total.</li>
                <li>Annulation entre 15 jours et 72 heures : retenue de 50 % du montant total.</li>
                <li>Annulation à moins de 72 heures : 100 % du montant est dû.</li>
              </ul>
              <p style={{ margin: '0' }}>
                Réciprocité : si SONELYX est contrainte d'annuler la location pour un motif autre que la force majeure ou la faute du Client, le Client sera intégralement remboursé des sommes versées.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 7 – Retrait, Restitution et Responsabilité
              </h2>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li><strong>Transfert de garde :</strong> dès la remise du matériel au dépôt, la garde juridique (Art. 1242 du Code civil) est transférée au Client. Il en devient seul responsable et doit le protéger contre le vol, la casse et les intempéries.</li>
                <li><strong>Restitution et Retard :</strong> le matériel doit être rendu propre, rangé et à l'heure convenue. Tout retard non convenu avec le loueur entraînera la facturation d'une journée de location supplémentaire par tranche de 24h entamée.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 8 – Assurances
              </h2>
              <p style={{ margin: '0' }}>
                Le matériel n'est pas assuré par SONELYX contre le vol ou la casse lors de son utilisation par le Client. Il est vivement recommandé au Client Consommateur de vérifier que son assurance Responsabilité Civile (garantie villégiature ou location) couvre ce type de biens. Les Clients Professionnels doivent justifier d'une assurance RC Professionnelle couvrant le matériel loué.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 9 – Force Majeure
              </h2>
              <p style={{ margin: '0' }}>
                La responsabilité de SONELYX ou du Client ne pourra être recherchée si l'exécution du contrat est retardée ou empêchée en raison d'un cas de force majeure, tel que défini par l'article 1218 du Code civil et la jurisprudence française.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 10 – Données Personnelles (RGPD)
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Les données collectées (identité, justificatifs) sont traitées par SONELYX (Responsable de traitement) pour la gestion des commandes et la sécurisation des locations (prévention des fraudes).
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li><strong>Durée de conservation :</strong> les contrats et données de facturation sont conservés 10 ans (obligation légale comptable). Les justificatifs d'identité sont supprimés après la restitution conforme du matériel et la levée de la caution.</li>
                <li><strong>Vos droits :</strong> conformément à la loi Informatique et Libertés et au RGPD, le Client dispose d'un droit d'accès, de rectification, d'effacement et d'opposition. Ces droits peuvent être exercés en contactant SONELYX à l'adresse e-mail <a href="mailto:contact@sonelyx.fr" style={{ color: '#0071e3', textDecoration: 'none' }}>contact@sonelyx.fr</a>. Le Client a également le droit d'introduire une réclamation auprès de la CNIL (cnil.fr).</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', marginBottom: '12px', color: '#1d1d1f' }}>
                Article 11 – Droit Applicable et Médiation
              </h2>
              <p style={{ margin: '0 0 12px' }}>
                Les présentes CGL sont soumises au droit français.
              </p>
              <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li><strong>Médiation (pour les Consommateurs) :</strong> en cas de litige, le Client Consommateur peut recourir gratuitement à un médiateur de la consommation (coordonnées du médiateur à préciser lors de l'adhésion à un service de médiation) avant toute action en justice.</li>
                <li>
                  <strong>Attribution de juridiction :</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>Pour les litiges avec des Clients Professionnels, compétence exclusive est attribuée au Tribunal de Commerce d'Orléans.</li>
                    <li>Pour les litiges avec des Clients Consommateurs, le tribunal compétent sera celui du lieu de domicile du défendeur ou du lieu de la livraison effective du service, conformément à la loi.</li>
                  </ul>
                </li>
              </ul>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
