import manifest from '../dist/manifest.json' with { type: 'json' };

function cloneManifest(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeBaseUrl(value) {
  if (value instanceof URL) {
    return new URL(value.href.endsWith('/') ? value.href : `${value.href}/`);
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return new URL(value.endsWith('/') ? value : `${value}/`);
}

export const westernManifest = manifest;
export const westernManifestUrl = new URL('../dist/manifest.json', import.meta.url);
export const westernAssetBaseUrl = new URL('../dist/', import.meta.url);

export function createWesternManifest(options = {}) {
  const nextManifest = cloneManifest(westernManifest);
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  if (!baseUrl) {
    return nextManifest;
  }

  if (typeof nextManifest.thumbnail === 'string' && nextManifest.thumbnail) {
    nextManifest.thumbnailUrl = new URL(nextManifest.thumbnail, baseUrl).href;
  }

  nextManifest.assetBaseUrl = baseUrl.href;
  nextManifest.constellations = nextManifest.constellations.map((constellation) => {
    if (!constellation.image?.file) {
      return constellation;
    }

    return {
      ...constellation,
      image: {
        ...constellation.image,
        url: new URL(constellation.image.file, baseUrl).href,
      },
    };
  });

  return nextManifest;
}

export function resolveWesternAssetUrl(relativePath, baseUrl = westernAssetBaseUrl) {
  return new URL(relativePath, baseUrl).href;
}
