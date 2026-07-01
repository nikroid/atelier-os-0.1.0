import { bumpMinor, bumpPatch, readPackageVersion, writePackageVersion } from './semver.mjs';

const current = readPackageVersion();
const [major] = current.split('.').map(Number);
/** Pré-v1 (0.x.x) : incrément patch à chaque déploiement. */
const next = major === 0 ? bumpPatch(current) : bumpMinor(current);
writePackageVersion(next);
console.log(`Version déploiement : ${current} → ${next}`);
