import { db } from '../db/database';

export { importArtdbFile as importBackup, downloadArtdbBackup as downloadBackup } from './artdbZip';

export async function seedDemoData(): Promise<void> {
  const count = await db.artists.count();
  if (count > 0) return;

  const ts = new Date().toISOString();
  const artistId = 'artist_demo';

  await db.artists.add({
    id: artistId,
    nom: 'Nicolas Labrunye',
    bio_fr:
      "Artiste plasticien, Nicolas Labrunye explore les frontières entre nature et technologie à travers des installations immersives et des œuvres sur toile.",
    bio_en:
      'Visual artist exploring the boundaries between nature and technology through immersive installations and paintings.',
    site: 'https://nicolaslabrunye.fr',
    instagram: '@nicolaslabrunye',
    email: 'contact@example.com',
    photoId: null,
    createdAt: ts,
    updatedAt: ts,
  });

  await db.works.bulkAdd([
    {
      id: 'work_001',
      ref: 'ART-2026-001',
      titre: 'Le Vagabond',
      artisteId: artistId,
      annee: 2026,
      technique: 'Huile sur toile',
      dimensions: '120 × 80 cm',
      prix: 2500,
      description: 'Une figure solitaire traversant un paysage onirique.',
      imageIds: [],
      statut: 'disponible',
      certificat: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'work_002',
      ref: 'ART-2026-002',
      titre: 'Forêt Algorithmique',
      artisteId: artistId,
      annee: 2025,
      technique: 'Acrylique et encre sur papier',
      dimensions: '70 × 50 cm',
      prix: 1200,
      description: 'Arbres générés par des processus computationnels.',
      imageIds: [],
      statut: 'disponible',
      certificat: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ]);

  await db.contacts.bulkAdd([
    {
      id: 'contact_001',
      nom: 'Dupont',
      prenom: 'Jean',
      categorie: 'journaliste',
      email: 'jean.dupont@artpress.fr',
      telephone: '+33 6 12 34 56 78',
      organisation: 'Art Press',
      notes: 'Spécialisé art contemporain',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'contact_002',
      nom: 'Martin',
      prenom: 'Sophie',
      categorie: 'galeriste',
      email: 'sophie@galerie-exemple.fr',
      telephone: '+33 1 42 00 00 00',
      organisation: 'Galerie Exemple',
      notes: '',
      createdAt: ts,
      updatedAt: ts,
    },
  ]);

  await db.exhibitions.add({
    id: 'expo_001',
    titre: 'Automne 2026',
    lieu: 'Atelier collectif, Paris',
    date_debut: '2026-09-15',
    date_fin: '2026-10-30',
    texte_curatorial:
      "Cette exposition réunit des œuvres qui interrogent notre rapport au vivant à l'ère numérique.",
    artisteId: artistId,
    oeuvreIds: ['work_001', 'work_002'],
    createdAt: ts,
    updatedAt: ts,
  });
}
