import {
  assetBaseUrl,
  manifestUrl,
  resolveAssetUrl,
} from '@found-in-space/stellarium-skycultures-western';
import { bundledManifest } from '@found-in-space/stellarium-skycultures-western/bundled';
import { anchoredImageManifest } from '@found-in-space/stellarium-skycultures-western/anchored-image';

const orion = bundledManifest.constellations.find((entry) => entry.iau === 'Ori');
const anchoredOrion = anchoredImageManifest.images.find((entry) => entry.groupId === 'Ori');

if (manifestUrl.protocol !== 'file:') {
  throw new Error(`Expected package manifest file URL, got ${manifestUrl.href}.`);
}

if (!resolveAssetUrl('illustrations/orion.webp').startsWith(assetBaseUrl.href)) {
  throw new Error('resolveAssetUrl did not resolve relative to assetBaseUrl.');
}

if (!orion?.image?.url?.startsWith('file:')) {
  throw new Error('Bundled manifest did not resolve Orion to a file URL.');
}

if (!anchoredOrion?.image?.src?.startsWith('file:')) {
  throw new Error('Anchored-image manifest did not resolve Orion to a file URL.');
}

console.log(orion.image.url);
