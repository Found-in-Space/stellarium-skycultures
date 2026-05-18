import { bundledManifest } from '@found-in-space/stellarium-skycultures-western/bundled';

const orion = bundledManifest.constellations.find((entry) => entry.id === 'orion')
  ?? bundledManifest.constellations.find((entry) => entry.iau === 'Ori');

if (!orion?.image?.url) {
  throw new Error('Orion artwork was not found in bundled manifest.');
}

console.log(orion.image.url);
