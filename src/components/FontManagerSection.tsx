import { useRef, useState } from 'react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useFonts } from '../hooks/useFonts';

export function FontManagerSection() {
  const { customFonts, importFont, deleteFont } = useFonts();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      await importFont(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import impossible');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteFont(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <section className="card-section">
      <h2>Polices</h2>
      <p className="hint">
        Catalogue intégré (Google Fonts) et polices importées (.woff2, .woff, .ttf, .otf). Les fichiers
        sont stockés localement dans ce navigateur et inclus dans les exports <code>.artdb</code>.
      </p>

      <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={importing}
          onClick={() => fileRef.current?.click()}
        >
          {importing ? 'Import…' : 'Importer une police'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
          hidden
          onChange={(e) => void handleImport(e)}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      {customFonts.length === 0 ? (
        <p className="hint">Aucune police importée. Utilisez le catalogue Google Fonts ou importez vos fichiers.</p>
      ) : (
        <ul className="font-manager-list">
          {customFonts.map((font) => (
            <li key={font.id} className="font-manager-item">
              <span className="font-manager-name" style={{ fontFamily: `'${font.familyName}', sans-serif` }}>
                {font.name}
              </span>
              <span className="hint font-manager-meta">{font.format.toUpperCase()}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                title="Supprimer"
                onClick={() => setDeleteTarget({ id: font.id, name: font.name })}
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Supprimer la police"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      >
        <p>
          Supprimer la police <strong>{deleteTarget?.name}</strong> ? Les blocs qui l'utilisent reviendront à la
          police par défaut.
        </p>
      </ConfirmDeleteModal>
    </section>
  );
}
