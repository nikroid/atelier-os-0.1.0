import { bumpMinor, readPackageVersion, writePackageVersion } from './semver.mjs';

const current = readPackageVersion();
const next = bumpMinor(current);
writePackageVersion(next);
console.log(`Version déploiement : ${current} → ${next}`);
