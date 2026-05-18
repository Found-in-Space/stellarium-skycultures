import { anchoredImageManifest } from '@found-in-space/stellarium-skycultures-western/anchored-image';

const orion = anchoredImageManifest.images.find((entry) => entry.groupId === 'Ori');

if (!orion?.image?.src) {
  throw new Error('Orion artwork was not found in anchored-image manifest.');
}

console.log(orion.image.src);
