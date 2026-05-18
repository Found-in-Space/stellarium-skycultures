import { createManifest } from './index.js';

export const ANCHORED_IMAGE_MANIFEST_FORMAT = "found-in-space/anchored-image-manifest@1";

const imageUrls = {
  "illustrations/andromeda.webp": new URL("../dist/illustrations/andromeda.webp", import.meta.url).href,
  "illustrations/antlia.webp": new URL("../dist/illustrations/antlia.webp", import.meta.url).href,
  "illustrations/apus.webp": new URL("../dist/illustrations/apus.webp", import.meta.url).href,
  "illustrations/aquarius.webp": new URL("../dist/illustrations/aquarius.webp", import.meta.url).href,
  "illustrations/aquila.webp": new URL("../dist/illustrations/aquila.webp", import.meta.url).href,
  "illustrations/ara.webp": new URL("../dist/illustrations/ara.webp", import.meta.url).href,
  "illustrations/argonavis.webp": new URL("../dist/illustrations/argonavis.webp", import.meta.url).href,
  "illustrations/aries.webp": new URL("../dist/illustrations/aries.webp", import.meta.url).href,
  "illustrations/auriga.webp": new URL("../dist/illustrations/auriga.webp", import.meta.url).href,
  "illustrations/bootes.webp": new URL("../dist/illustrations/bootes.webp", import.meta.url).href,
  "illustrations/caelum.webp": new URL("../dist/illustrations/caelum.webp", import.meta.url).href,
  "illustrations/camelopardalis.webp": new URL("../dist/illustrations/camelopardalis.webp", import.meta.url).href,
  "illustrations/cancer.webp": new URL("../dist/illustrations/cancer.webp", import.meta.url).href,
  "illustrations/canes-venatici.webp": new URL("../dist/illustrations/canes-venatici.webp", import.meta.url).href,
  "illustrations/canis-major.webp": new URL("../dist/illustrations/canis-major.webp", import.meta.url).href,
  "illustrations/canis-minor.webp": new URL("../dist/illustrations/canis-minor.webp", import.meta.url).href,
  "illustrations/capricornus.webp": new URL("../dist/illustrations/capricornus.webp", import.meta.url).href,
  "illustrations/cassiopeia.webp": new URL("../dist/illustrations/cassiopeia.webp", import.meta.url).href,
  "illustrations/centaurus.webp": new URL("../dist/illustrations/centaurus.webp", import.meta.url).href,
  "illustrations/cepheus.webp": new URL("../dist/illustrations/cepheus.webp", import.meta.url).href,
  "illustrations/cetus.webp": new URL("../dist/illustrations/cetus.webp", import.meta.url).href,
  "illustrations/chamaeleon.webp": new URL("../dist/illustrations/chamaeleon.webp", import.meta.url).href,
  "illustrations/circinus.webp": new URL("../dist/illustrations/circinus.webp", import.meta.url).href,
  "illustrations/columba.webp": new URL("../dist/illustrations/columba.webp", import.meta.url).href,
  "illustrations/coma-berenices.webp": new URL("../dist/illustrations/coma-berenices.webp", import.meta.url).href,
  "illustrations/corona-australis.webp": new URL("../dist/illustrations/corona-australis.webp", import.meta.url).href,
  "illustrations/corona-borealis.webp": new URL("../dist/illustrations/corona-borealis.webp", import.meta.url).href,
  "illustrations/corvus.webp": new URL("../dist/illustrations/corvus.webp", import.meta.url).href,
  "illustrations/crater.webp": new URL("../dist/illustrations/crater.webp", import.meta.url).href,
  "illustrations/crux.webp": new URL("../dist/illustrations/crux.webp", import.meta.url).href,
  "illustrations/cygnus.webp": new URL("../dist/illustrations/cygnus.webp", import.meta.url).href,
  "illustrations/delphinus.webp": new URL("../dist/illustrations/delphinus.webp", import.meta.url).href,
  "illustrations/dorado.webp": new URL("../dist/illustrations/dorado.webp", import.meta.url).href,
  "illustrations/draco.webp": new URL("../dist/illustrations/draco.webp", import.meta.url).href,
  "illustrations/equuleus.webp": new URL("../dist/illustrations/equuleus.webp", import.meta.url).href,
  "illustrations/eridanus.webp": new URL("../dist/illustrations/eridanus.webp", import.meta.url).href,
  "illustrations/fornax.webp": new URL("../dist/illustrations/fornax.webp", import.meta.url).href,
  "illustrations/gemini.webp": new URL("../dist/illustrations/gemini.webp", import.meta.url).href,
  "illustrations/grus.webp": new URL("../dist/illustrations/grus.webp", import.meta.url).href,
  "illustrations/hercules.webp": new URL("../dist/illustrations/hercules.webp", import.meta.url).href,
  "illustrations/horlogium.webp": new URL("../dist/illustrations/horlogium.webp", import.meta.url).href,
  "illustrations/hydra.webp": new URL("../dist/illustrations/hydra.webp", import.meta.url).href,
  "illustrations/hydrus.webp": new URL("../dist/illustrations/hydrus.webp", import.meta.url).href,
  "illustrations/indus.webp": new URL("../dist/illustrations/indus.webp", import.meta.url).href,
  "illustrations/lacerta.webp": new URL("../dist/illustrations/lacerta.webp", import.meta.url).href,
  "illustrations/leo-minor.webp": new URL("../dist/illustrations/leo-minor.webp", import.meta.url).href,
  "illustrations/leo.webp": new URL("../dist/illustrations/leo.webp", import.meta.url).href,
  "illustrations/lepus.webp": new URL("../dist/illustrations/lepus.webp", import.meta.url).href,
  "illustrations/libra.webp": new URL("../dist/illustrations/libra.webp", import.meta.url).href,
  "illustrations/lupus.webp": new URL("../dist/illustrations/lupus.webp", import.meta.url).href,
  "illustrations/lynx.webp": new URL("../dist/illustrations/lynx.webp", import.meta.url).href,
  "illustrations/lyra.webp": new URL("../dist/illustrations/lyra.webp", import.meta.url).href,
  "illustrations/mensa.webp": new URL("../dist/illustrations/mensa.webp", import.meta.url).href,
  "illustrations/microscopium.webp": new URL("../dist/illustrations/microscopium.webp", import.meta.url).href,
  "illustrations/monoceros.webp": new URL("../dist/illustrations/monoceros.webp", import.meta.url).href,
  "illustrations/musca.webp": new URL("../dist/illustrations/musca.webp", import.meta.url).href,
  "illustrations/norma.webp": new URL("../dist/illustrations/norma.webp", import.meta.url).href,
  "illustrations/octans.webp": new URL("../dist/illustrations/octans.webp", import.meta.url).href,
  "illustrations/ophiuchus.webp": new URL("../dist/illustrations/ophiuchus.webp", import.meta.url).href,
  "illustrations/orion.webp": new URL("../dist/illustrations/orion.webp", import.meta.url).href,
  "illustrations/pavo.webp": new URL("../dist/illustrations/pavo.webp", import.meta.url).href,
  "illustrations/pegasus.webp": new URL("../dist/illustrations/pegasus.webp", import.meta.url).href,
  "illustrations/perseus.webp": new URL("../dist/illustrations/perseus.webp", import.meta.url).href,
  "illustrations/phoenix.webp": new URL("../dist/illustrations/phoenix.webp", import.meta.url).href,
  "illustrations/pictor.webp": new URL("../dist/illustrations/pictor.webp", import.meta.url).href,
  "illustrations/pisces.webp": new URL("../dist/illustrations/pisces.webp", import.meta.url).href,
  "illustrations/piscis-austrinus.webp": new URL("../dist/illustrations/piscis-austrinus.webp", import.meta.url).href,
  "illustrations/pyxis.webp": new URL("../dist/illustrations/pyxis.webp", import.meta.url).href,
  "illustrations/reticulum.webp": new URL("../dist/illustrations/reticulum.webp", import.meta.url).href,
  "illustrations/sagitta.webp": new URL("../dist/illustrations/sagitta.webp", import.meta.url).href,
  "illustrations/sagittarius.webp": new URL("../dist/illustrations/sagittarius.webp", import.meta.url).href,
  "illustrations/scorpius.webp": new URL("../dist/illustrations/scorpius.webp", import.meta.url).href,
  "illustrations/sculptor.webp": new URL("../dist/illustrations/sculptor.webp", import.meta.url).href,
  "illustrations/scutum.webp": new URL("../dist/illustrations/scutum.webp", import.meta.url).href,
  "illustrations/sextans.webp": new URL("../dist/illustrations/sextans.webp", import.meta.url).href,
  "illustrations/taurus.webp": new URL("../dist/illustrations/taurus.webp", import.meta.url).href,
  "illustrations/telescopium.webp": new URL("../dist/illustrations/telescopium.webp", import.meta.url).href,
  "illustrations/triangulum-australe.webp": new URL("../dist/illustrations/triangulum-australe.webp", import.meta.url).href,
  "illustrations/triangulum.webp": new URL("../dist/illustrations/triangulum.webp", import.meta.url).href,
  "illustrations/tucana.webp": new URL("../dist/illustrations/tucana.webp", import.meta.url).href,
  "illustrations/ursa-major.webp": new URL("../dist/illustrations/ursa-major.webp", import.meta.url).href,
  "illustrations/ursa-minor.webp": new URL("../dist/illustrations/ursa-minor.webp", import.meta.url).href,
  "illustrations/virgo.webp": new URL("../dist/illustrations/virgo.webp", import.meta.url).href,
  "illustrations/volans.webp": new URL("../dist/illustrations/volans.webp", import.meta.url).href,
  "illustrations/vulpecula.webp": new URL("../dist/illustrations/vulpecula.webp", import.meta.url).href,
};

export const anchoredImageManifest = createAnchoredImageManifest();

export function createAnchoredImageManifest(options = {}) {
  return toAnchoredImageManifest(createManifest(options), {
    imageUrls: options.imageUrls ?? imageUrls,
  });
}

function toAnchoredImageManifest(manifest, options = {}) {
  const imageUrls = options.imageUrls ?? {};
  return {
    format: ANCHORED_IMAGE_MANIFEST_FORMAT,
    id: manifest.id,
    label: manifest.id,
    assetBaseUrl: null,
    images: (manifest.constellations ?? []).map((constellation, index) => toAnchoredImage(constellation, manifest, imageUrls, index)),
    attribution: manifest.license,
    metadata: {
      sourceFormat: manifest.format,
      sourcePackage: manifest.source,
      astrometry: manifest.astrometry,
    },
  };
}

function toAnchoredImage(constellation, manifest, imageUrls, index) {
  const image = constellation.image ?? {};
  const imageFile = image.file;
  return {
    id: constellation.id ?? constellation.iau ?? `anchored-image-${index}`,
    label: resolveConstellationLabel(constellation),
    groupId: constellation.iau ?? undefined,
    image: {
      src: image.url ?? imageUrls[imageFile] ?? imageFile ?? '',
      width: Array.isArray(image.size) && Number.isFinite(Number(image.size[0])) ? Number(image.size[0]) : 512,
      height: Array.isArray(image.size) && Number.isFinite(Number(image.size[1])) ? Number(image.size[1]) : 512,
      anchors: (image.anchors ?? []).map(toAnchoredImageAnchor).filter(Boolean),
    },
    attribution: manifest.license,
    metadata: {
      skycultureId: manifest.id,
      sourceFormat: manifest.format,
      sourceConstellationId: constellation.id ?? null,
      iau: constellation.iau ?? null,
      common_name: constellation.common_name ?? null,
      lines: Array.isArray(constellation.lines) ? constellation.lines : [],
    },
  };
}

function toAnchoredImageAnchor(anchor) {
  const icrs = anchor?.icrs;
  const pixel = anchor?.pixel;
  if (!icrs || !pixel) {
    return null;
  }
  return {
    pixel: {
      x: Number(pixel.x),
      y: Number(pixel.y),
    },
    target: {
      kind: 'direction',
      frame: 'icrs',
      x: Number(icrs.x),
      y: Number(icrs.y),
      z: Number(icrs.z),
    },
    metadata: {
      hip: anchor.hip,
      raDeg: anchor.raDeg,
      decDeg: anchor.decDeg,
    },
  };
}

function resolveConstellationLabel(constellation) {
  const commonName = constellation.common_name;
  if (commonName && typeof commonName === 'object') {
    if (typeof commonName.native === 'string' && commonName.native.trim()) {
      return commonName.native.trim();
    }
    if (typeof commonName.english === 'string' && commonName.english.trim()) {
      return commonName.english.trim();
    }
  }
  return constellation.iau ?? constellation.id ?? null;
}
