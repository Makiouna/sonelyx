export interface EquipmentItem {
  id: string;
  cat: string;
  catLabel: string;
  brand: string;
  name: string;
  desc: string;
  specs: string[];
}

export const CATALOGUE: EquipmentItem[] = [
  { id: 'line-array-k-series', cat: 'diffusion', catLabel: 'DIFFUSION', brand: 'L-Acoustics', name: 'Line-Array K-Series', desc: 'Système de référence pour grandes jauges et festivals.', specs: ['138 dB SPL', '25 Hz–20 kHz', 'Line-array'] },
  { id: 'subwoofer-sl-series', cat: 'diffusion', catLabel: 'DIFFUSION', brand: 'd&b audiotechnik', name: 'Subwoofer SL-Series', desc: 'Renfort de graves directif, sans débordement sur scène.', specs: ['Cardioïde', 'Infrabasses', 'Calibré'] },
  { id: 'point-source-geo', cat: 'diffusion', catLabel: 'DIFFUSION', brand: 'NEXO', name: 'Point-Source Geo', desc: 'Diffusion de proximité haute définition pour salles et clubs.', specs: ['Point-source', 'Compact', 'Haute déf.'] },
  { id: 'retours-x-series', cat: 'diffusion', catLabel: 'DIFFUSION', brand: 'L-Acoustics', name: 'Retours de scène X-Series', desc: 'Wedges de monitoring pour le confort des artistes.', specs: ['Monitoring', 'Coaxial', 'Scène'] },
  { id: 'lyre-bmfl', cat: 'eclairage', catLabel: 'ÉCLAIRAGE', brand: 'Robe', name: 'Lyre Asservie BMFL', desc: 'Spot motorisé haute puissance pour faisceaux nets et précis.', specs: ['Spot', 'CMY', 'Zoom 5–55°'] },
  { id: 'wash-led-full-spectrum', cat: 'eclairage', catLabel: 'ÉCLAIRAGE', brand: 'Martin', name: 'Wash LED Full-Spectrum', desc: 'Nappes de couleur homogènes, plein spectre.', specs: ['RGBW', '16-bit', 'LED'] },
  { id: 'barre-led-pixel', cat: 'eclairage', catLabel: 'ÉCLAIRAGE', brand: 'GLP', name: 'Barre LED Pixel', desc: 'Effets graphiques rythmés et pixel mapping.', specs: ['Pixel mapping', 'LED', 'Strobe'] },
  { id: 'hazer-brouillard', cat: 'eclairage', catLabel: 'ÉCLAIRAGE', brand: 'MDG', name: 'Hazer / Brouillard', desc: 'Révèle les faisceaux, atmosphère maîtrisée.', specs: ['Hazer', 'Faible densité', 'DMX'] },
  { id: 'regie-cdj-3000', cat: 'regie', catLabel: 'RÉGIE', brand: 'Pioneer DJ', name: 'Régie CDJ-3000', desc: 'Régie DJ standard club, prête pour tout artiste.', specs: ['2× CDJ-3000', 'DJM-A9', 'Pro DJ'] },
  { id: 'console-dlive-s', cat: 'regie', catLabel: 'RÉGIE', brand: 'Allen & Heath', name: 'Console dLive S-Class', desc: 'Mixage numérique pour grandes productions live.', specs: ['128 entrées', '96 kHz', 'Numérique'] },
  { id: 'console-magicq', cat: 'regie', catLabel: 'RÉGIE', brand: 'ChamSys', name: 'Console Lumière MagicQ', desc: 'Pilotage lumière complet, shows programmés au cue.', specs: ['DMX', 'Timeline', 'Cues'] },
  { id: 'micros-axient', cat: 'regie', catLabel: 'RÉGIE', brand: 'Shure', name: 'Micros HF Axient Digital', desc: 'Liaisons HF fiables, large bande, anti-brouillage.', specs: ['UHF', 'Numérique', 'Diversity'] },
  { id: 'pont-truss', cat: 'structure', catLabel: 'STRUCTURE', brand: 'Prolyte', name: 'Pont aluminium (truss)', desc: 'Structures de portée pour accroche son et lumière.', specs: ['Alu', 'Charge calculée', 'Modulaire'] },
  { id: 'levage-mat', cat: 'structure', catLabel: 'STRUCTURE', brand: 'GIS', name: 'Levage / mât télescopique', desc: 'Élévation sécurisée des structures et line-array.', specs: ['Levage', 'Sécurisé', 'Réglable'] },
  { id: 'armoire-distribution', cat: 'energie', catLabel: 'ÉNERGIE', brand: 'Power Dist.', name: 'Armoire de distribution', desc: 'Distribution électrique sécurisée et protégée.', specs: ['Triphasé', 'Protégé', 'Différentiel'] },
  { id: 'groupe-electrogene', cat: 'energie', catLabel: 'ÉNERGIE', brand: 'Power Gen.', name: 'Groupe électrogène insonorisé', desc: 'Autonomie énergétique pour sites non équipés.', specs: ['Insonorisé', 'Autonome', 'Pro'] }
];
