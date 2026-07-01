import { APP_BUILD_TIME, APP_VERSION } from 'virtual:atelier-build';

export { APP_BUILD_TIME, APP_VERSION };

export function getVersionLabel(): string {
  return APP_VERSION;
}

export function getVersionFull(): string {
  return `v${APP_VERSION} — ${APP_BUILD_TIME}`;
}
