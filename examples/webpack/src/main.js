import { anchoredImageManifest } from '@found-in-space/stellarium-skycultures-western/anchored-image';

const orion = anchoredImageManifest.images.find((entry) => entry.groupId === 'Ori');

if (!orion?.image?.src) {
  throw new Error('Orion artwork was not found in anchored-image manifest.');
}

document.querySelector('[data-title]').textContent = orion.label ?? orion.id;
document.querySelector('[data-art]').src = orion.image.src;
document.querySelector('[data-url]').textContent = orion.image.src;
