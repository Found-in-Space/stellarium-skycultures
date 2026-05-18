import manifestJson from '../dist/manifest.json' with { type: 'json' };

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

export const manifest = manifestJson;
export const manifestUrl = new URL('../dist/manifest.json', import.meta.url);
export const assetBaseUrl = new URL('./', manifestUrl);

export function createManifest(options = {}) {
  const nextManifest = cloneManifest(manifest);
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

export function resolveAssetUrl(relativePath, baseUrl = assetBaseUrl) {
  return new URL(relativePath, baseUrl).href;
}
