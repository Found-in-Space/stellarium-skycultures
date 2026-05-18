import { bundledManifest } from '@found-in-space/stellarium-skycultures-western/bundled';

const orion = bundledManifest.constellations.find((entry) => entry.id === 'orion')
  ?? bundledManifest.constellations.find((entry) => entry.iau === 'Ori');

if (!orion?.image?.url) {
  throw new Error('Orion artwork was not found in bundled manifest.');
}

document.querySelector('[data-title]').textContent = orion.metadata?.common_name ?? orion.id;
document.querySelector('[data-art]').src = orion.image.url;
document.querySelector('[data-url]').textContent = orion.image.url;
