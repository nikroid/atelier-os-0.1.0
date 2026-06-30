import { db, now } from '../db/database';
import type { GmailAuth } from '../types/mail';
import { GMAIL_SCOPES } from '../types/mail';

const GMAIL_AUTH_ID = 'gmail' as const;
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const TOKEN_BUFFER_MS = 60_000;
const AUTH_TIMEOUT_MS = 120_000;

function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!id) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID manquant. Consultez DEPLOY.md pour configurer Gmail.',
    );
  }
  return id;
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Échec chargement Google Identity Services')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Échec chargement Google Identity Services'));
    document.head.appendChild(script);
  });
}

function parseGisError(err: unknown): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';

  if (/popup/i.test(message)) {
    return 'Popup bloquée par le navigateur. Ouvrez l’app dans Chrome ou Safari (pas le navigateur Cursor), autorisez les popups pour localhost:5191, puis recliquez Connecter Gmail.';
  }

  if (err instanceof Error && !message.includes('popup')) return err.message;

  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = String((err as { type: string }).type);
    if (type === 'popup_closed') {
      return 'Connexion interrompue. Fermez l’onglet Google resté ouvert, puis réessayez.';
    }
    if (type === 'popup_failed_to_open') {
      return 'Popup bloquée. Utilisez Chrome/Safari et autorisez les popups pour localhost:5191.';
    }
    return `Erreur Google (${type})`;
  }
  return 'Connexion Gmail échouée';
}

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const userinfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (userinfo.ok) {
    const data = (await userinfo.json()) as { email?: string };
    if (data.email) return data.email;
  }

  const tokeninfo = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (tokeninfo.ok) {
    const data = (await tokeninfo.json()) as { email?: string };
    if (data.email) return data.email;
  }

  throw new Error('Impossible de récupérer l’adresse Gmail (vérifiez les scopes OAuth).');
}

async function requestAccessToken(prompt?: 'consent'): Promise<{ accessToken: string; expiresAt: number }> {
  await loadGoogleScript();
  const clientId = getClientId();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      fn();
    };

    const timer = window.setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            'Délai dépassé. Fermez les onglets Google restés ouverts, vérifiez les popups et réessayez.',
          ),
        ),
      );
    }, AUTH_TIMEOUT_MS);

    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          finish(() => reject(new Error(response.error ?? 'Connexion Gmail annulée')));
          return;
        }
        const expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
        finish(() => resolve({ accessToken: response.access_token, expiresAt }));
      },
      error_callback: (err) => finish(() => reject(new Error(parseGisError(err)))),
    });
    client.requestAccessToken(prompt ? { prompt } : undefined);
  });
}

export async function getGmailAuth(): Promise<GmailAuth | undefined> {
  return db.gmailAuth.get(GMAIL_AUTH_ID);
}

export async function connectGmail(): Promise<GmailAuth> {
  const { accessToken, expiresAt } = await requestAccessToken('consent');
  const email = await fetchGoogleEmail(accessToken);
  const auth: GmailAuth = {
    id: GMAIL_AUTH_ID,
    email,
    accessToken,
    expiresAt,
    updatedAt: now(),
  };
  await db.gmailAuth.put(auth);
  return auth;
}

export async function disconnectGmail(): Promise<void> {
  const auth = await getGmailAuth();
  if (auth?.accessToken && window.google?.accounts?.oauth2) {
    try {
      await loadGoogleScript();
      await new Promise<void>((resolve) => {
        window.google!.accounts.oauth2.revoke(auth.accessToken, () => resolve());
      });
    } catch {
      /* revoke optionnel */
    }
  }
  await db.gmailAuth.delete(GMAIL_AUTH_ID);
}

export async function getValidAccessToken(): Promise<string | null> {
  const auth = await getGmailAuth();
  if (!auth) return null;
  if (auth.expiresAt > Date.now() + TOKEN_BUFFER_MS) {
    return auth.accessToken;
  }
  return null;
}

/** Token valide ou reconnexion silencieuse / interactive. */
export async function ensureGmailAccessToken(interactive = true): Promise<string> {
  const existing = await getValidAccessToken();
  if (existing) return existing;

  const auth = await getGmailAuth();
  if (auth && interactive) {
    try {
      const { accessToken, expiresAt } = await requestAccessToken();
      const email = await fetchGoogleEmail(accessToken);
      await db.gmailAuth.put({
        ...auth,
        email,
        accessToken,
        expiresAt,
        updatedAt: now(),
      });
      return accessToken;
    } catch {
      /* nouvelle connexion complète */
    }
  }

  if (!interactive) {
    throw new Error('Session Gmail expirée. Reconnectez Gmail dans Paramètres.');
  }

  const fresh = await connectGmail();
  return fresh.accessToken;
}

export function isGmailConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}
