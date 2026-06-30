import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useSettings } from '../hooks/useSettings';
import { useStats } from '../hooks/useDatabase';
import { MODE_LABELS } from '../types/settings';
import { importBackup } from '../utils/backup';
import { seedDemoData } from '../utils/backup';

export function DashboardPage() {
  const stats = useStats();
  const { mode } = useSettings();
  const labels = MODE_LABELS[mode];

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importBackup(file);
      alert(
        `Import réussi : ${result.counts.artistes} artistes, ${result.counts.oeuvres} œuvres, ${result.counts.contacts} contacts, ${result.counts.expositions} expositions, ${result.counts.modeles} modèle(s).`,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur import');
    }
    e.target.value = '';
  };

  const handleSeed = async () => {
    await seedDemoData();
    window.location.reload();
  };

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={`${labels.title} — une base de données, tous les documents en dérivent.`}
      />
      <div className="stats-grid">
        <StatCard label={labels.works} value={stats?.works ?? 0} to="/oeuvres" />
        <StatCard label={labels.artists} value={stats?.artists ?? 0} to="/artistes" />
        <StatCard label="Contacts" value={stats?.contacts ?? 0} to="/contacts" />
        <StatCard label="Expositions" value={stats?.exhibitions ?? 0} to="/expositions" />
      </div>

      <section className="card-section">
        <h2>Démarrage rapide</h2>
        <div className="quick-actions">
          <Link to="/oeuvres" className="action-card">
            <strong>+ Nouvelle œuvre</strong>
            <span>Enregistrer titre, technique, images</span>
          </Link>
          <Link to="/generer" className="action-card">
            <strong>Générer des documents</strong>
            <span>Cartels, certificats, catalogues PDF</span>
          </Link>
          <Link to="/parametres" className="action-card">
            <strong>Paramètres</strong>
            <span>Mode artiste ou galerie</span>
          </Link>
        </div>
      </section>

      <section className="card-section">
        <h2>Sauvegarde & données</h2>
        <p className="hint">
          Toutes les données sont stockées localement dans votre navigateur (IndexedDB). Exportez
          régulièrement un fichier <code>.artdb</code> pour les sauvegarder.
        </p>
        <div className="btn-row">
          <label className="btn btn-secondary">
            Importer .artdb
            <input type="file" accept=".artdb,.json,.zip" hidden onChange={handleImport} />
          </label>
          <button type="button" className="btn btn-ghost" onClick={handleSeed}>
            Charger données démo
          </button>
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </Link>
  );
}
