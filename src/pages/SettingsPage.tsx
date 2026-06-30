import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useGmailAuth } from '../hooks/useGmailAuth';
import { useSettings } from '../hooks/useSettings';
import { MODE_LABELS } from '../types/settings';
import { downloadBackup } from '../utils/backup';
import { formatStorageSize, getStorageStats } from '../utils/mediaStore';

export function SettingsPage() {
  const { settings, setMode } = useSettings();
  const { auth, isConfigured, isConnected, isExpired, connecting, connectError, connect, disconnect } =
    useGmailAuth();
  const [storage, setStorage] = useState<{ imageCount: number; totalBytes: number } | null>(null);

  useEffect(() => {
    void getStorageStats().then(setStorage);
  }, []);

  return (
    <>
      <PageHeader
        title="Paramètres"
        subtitle="Configurez Atelier OS selon votre profil"
      />

      <section className="card-section settings-mode">
        <h2>Mode d'utilisation</h2>
        <p className="hint">
          Adapte l'interface et les libellés à votre activité. Les données restent les mêmes —
          seule la présentation change.
        </p>

        <div className="mode-cards">
          <button
            type="button"
            className={`mode-card ${settings.mode === 'artist' ? 'active' : ''}`}
            onClick={() => setMode('artist')}
          >
            <span className="mode-icon">🎨</span>
            <strong>Artiste</strong>
            <span>Mes œuvres, mon profil, cartels & certificats</span>
          </button>
          <button
            type="button"
            className={`mode-card ${settings.mode === 'gallery' ? 'active' : ''}`}
            onClick={() => setMode('gallery')}
          >
            <span className="mode-icon">🏛</span>
            <strong>Galerie</strong>
            <span>Collection, multi-artistes, contacts & expositions</span>
          </button>
        </div>

        <p className="hint mode-active-label">
          Actif : <strong>{MODE_LABELS[settings.mode].title}</strong>
        </p>
      </section>

      <section className="card-section">
        <h2>Compte Gmail</h2>
        {!isConfigured ? (
          <p className="hint">
            L’envoi de mails nécessite un Client ID Google. Ajoutez{' '}
            <code>VITE_GOOGLE_CLIENT_ID</code> en local ou sur GitHub Actions — voir{' '}
            <code>DEPLOY.md</code>.
          </p>
        ) : isConnected && !isExpired ? (
          <>
            <p className="hint">
              Connecté en tant que <strong>{auth?.email}</strong>. Les mails partent depuis ce compte.
            </p>
            <p className="hint">
              Le token expire après environ une heure — reconnectez si l’envoi échoue.
            </p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void disconnect()}>
              Déconnecter Gmail
            </button>
          </>
        ) : (
          <>
            <p className="hint">
              {isExpired
                ? 'Session expirée. Reconnectez Gmail pour continuer à envoyer des mails.'
                : 'Connectez Gmail pour envoyer des mails aux contacts depuis Atelier OS.'}
            </p>
            <p className="hint">
              La connexion Gmail ouvre une fenêtre Google — utilisez <strong>Chrome</strong> ou{' '}
              <strong>Safari</strong> (le navigateur intégré à Cursor bloque souvent les popups).
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={connecting}
              onClick={() => void connect().catch(() => undefined)}
            >
              {connecting ? 'Connexion…' : 'Connecter Gmail'}
            </button>
            {connectError && <p className="form-error">{connectError}</p>}
            <details className="hint" style={{ marginTop: '0.75rem' }}>
              <summary>Ça ne marche pas ? Vérifications Google Cloud</summary>
              <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                <li>
                  <strong>Origines JavaScript</strong> : <code>http://localhost:5191</code> et{' '}
                  <code>https://nikroid.github.io</code> (voir DEPLOY.md)
                </li>
                <li>
                  <strong>Domaine autorisé</strong> sur l’écran de consentement :{' '}
                  <code>github.io</code>
                </li>
                <li>
                  <strong>Scopes</strong> : <code>gmail.send</code>, <code>userinfo.email</code>,{' '}
                  <code>openid</code>
                </li>
                <li>
                  <strong>Utilisateurs test</strong> : ton Gmail ajouté (mode Test)
                </li>
                <li>
                  <strong>Popups</strong> : autoriser pour <code>localhost:5191</code> si le message
                  « popup » apparaît
                </li>
                <li>
                  Sur l’écran Google « app non validée » → cliquer <strong>Continuer</strong>
                </li>
              </ol>
            </details>
          </>
        )}
        <p className="hint" style={{ marginTop: '0.75rem' }}>
          Envoi en ligne uniquement. Pièces jointes possibles depuis la modale d’envoi (fichier ou PDF généré).
        </p>
      </section>

      <section className="card-section">
        <h2>Stockage images</h2>
        <p className="hint">
          Les photos sont optimisées automatiquement à l&apos;import (miniature, affichage, original plafonné).
        </p>
        {storage ? (
          <p className="storage-stats">
            <strong>{storage.imageCount}</strong> image{storage.imageCount !== 1 ? 's' : ''} ·{' '}
            <strong>{formatStorageSize(storage.totalBytes)}</strong>
          </p>
        ) : (
          <p className="hint">Calcul du stockage…</p>
        )}
      </section>

      <section className="card-section">
        <h2>Sauvegarde</h2>
        <p className="hint">
          Vos données sont stockées localement dans ce navigateur. Exportez régulièrement un fichier{' '}
          <code>.artdb</code> (archive ZIP avec images) pour les conserver ou les transférer sur un autre
          appareil (import depuis le tableau de bord).
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadBackup()}>
          Exporter .artdb
        </button>
      </section>

      <section className="card-section">
        <h2>Différences par mode</h2>
        <div className="mode-compare">
          <div>
            <h4>Artiste</h4>
            <ul>
              <li>Navigation centrée œuvres & génération</li>
              <li>« Mes œuvres » / « Mon profil »</li>
              <li>Contacts en retrait</li>
            </ul>
          </div>
          <div>
            <h4>Galerie</h4>
            <ul>
              <li>Navigation centrée collection & réseau</li>
              <li>« Collection » / « Artistes »</li>
              <li>Contacts & expositions en avant</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
