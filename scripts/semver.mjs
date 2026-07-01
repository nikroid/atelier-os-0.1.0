import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/** @param {string} version */
export function parseSemver(version) {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Version semver invalide : ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** @param {{ major: number, minor: number, patch: number }} parts */
export function formatSemver(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

/** @param {string} version */
export function bumpPatch(version) {
  const parts = parseSemver(version);
  parts.patch += 1;
  return formatSemver(parts);
}

/** @param {string} version */
export function bumpMinor(version) {
  const parts = parseSemver(version);
  parts.minor += 1;
  parts.patch = 0;
  return formatSemver(parts);
}

/** @param {string} version */
export function bumpMajor(version) {
  const parts = parseSemver(version);
  parts.major += 1;
  parts.minor = 0;
  parts.patch = 0;
  return formatSemver(parts);
}

/** @param {string} [pkgPath] */
export function readPackageVersion(pkgPath = resolve('package.json')) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  if (!pkg.version || typeof pkg.version !== 'string') {
    throw new Error('package.json sans champ version');
  }
  return pkg.version;
}

/** @param {string} version @param {string} [pkgPath] */
export function writePackageVersion(version, pkgPath = resolve('package.json')) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  return version;
}
