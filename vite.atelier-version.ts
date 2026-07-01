import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { Plugin } from 'vite';
import { bumpPatch, readPackageVersion, writePackageVersion } from './scripts/semver.mjs';

const VIRTUAL_ID = 'virtual:atelier-build';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const PKG_PATH = resolve('package.json');

interface VersionState {
  version: string;
  builtAt: string;
}

function readVersionState(): VersionState {
  return {
    version: readPackageVersion(PKG_PATH),
    builtAt: new Date().toISOString(),
  };
}

function bumpPatchInPackage(): VersionState {
  const current = readPackageVersion(PKG_PATH);
  const next = bumpPatch(current);
  writePackageVersion(next, PKG_PATH);
  return { version: next, builtAt: new Date().toISOString() };
}

function moduleSource(state: VersionState): string {
  return [
    `export const APP_VERSION = ${JSON.stringify(state.version)};`,
    `export const APP_BUILD_TIME = ${JSON.stringify(state.builtAt)};`,
  ].join('\n');
}

export function atelierVersionPlugin(): Plugin {
  let state = readVersionState();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const reloadVirtualModule = (server: import('vite').ViteDevServer) => {
    const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
    if (!mod) return;
    server.moduleGraph.invalidateModule(mod);
    server.ws.send({ type: 'full-reload' });
  };

  return {
    name: 'atelier-version',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) return moduleSource(state);
    },
    buildStart() {
      state = readVersionState();
    },
    configureServer(server) {
      state = readVersionState();

      server.watcher.on('change', (file) => {
        if (!file.includes('/src/') && !file.includes('\\src\\')) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state = bumpPatchInPackage();
          reloadVirtualModule(server);
        }, 600);
      });
    },
    transformIndexHtml(html) {
      return html
        .replace(
          '<html lang="fr">',
          `<html lang="fr" data-atelier-version="${state.version}" data-atelier-built-at="${state.builtAt}">`,
        )
        .replace(
          '</head>',
          `    <meta name="atelier-os-version" content="${state.version}" />\n    <meta name="atelier-os-build" content="${state.builtAt}" />\n  </head>`,
        );
    },
    writeBundle() {
      writeFileSync(
        'dist/version.json',
        `${JSON.stringify(
          {
            version: state.version,
            builtAt: state.builtAt,
          },
          null,
          2,
        )}\n`,
      );

      const swPath = resolve('dist/sw.js');
      if (existsSync(swPath)) {
        const sw = readFileSync(swPath, 'utf-8').replace(
          /const CACHE = '[^']+'/,
          `const CACHE = 'atelier-os-v${state.version}'`,
        );
        writeFileSync(swPath, sw);
      }
    },
    transform(code, id) {
      if (id.endsWith('/public/sw.js') || id.endsWith('\\public\\sw.js')) {
        return code.replace(
          /const CACHE = '[^']+'/,
          `const CACHE = 'atelier-os-v${state.version}'`,
        );
      }
    },
  };
}
