import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const vendorRoot = path.join(repoRoot, 'vendor/stellarium-skycultures');
const SKYCULTURE_MANIFEST_FORMAT = 'found-in-space/stellarium-skyculture-manifest@1';
const ANCHORED_IMAGE_MANIFEST_FORMAT = 'found-in-space/anchored-image-manifest@1';

const ANCHOR_ASTROMETRY = {
  frame: 'icrs',
  coordinateKind: 'unit-vector',
  catalog: 'Hipparcos New Reduction',
  vizierCatalog: 'I/311/hip2',
  sourceEpoch: 'J1991.25',
  targetEpoch: 'J2016.0',
  properMotionApplied: true,
  requiredSourceColumns: ['HIP', 'RArad', 'DErad', 'Plx', 'pmRA', 'pmDE'],
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeFile(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function writeJson(filePath, value) {
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function discoverCulturePackageConfigs() {
  if (!fs.existsSync(packagesRoot)) return [];
  return fs.readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesRoot, entry.name))
    .map((packageDir) => {
      const configPath = path.join(packageDir, 'source/package-config.json');
      return fs.existsSync(configPath)
        ? normalizeCultureConfig(readJson(configPath), { packageDir, configPath })
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.cultureId.localeCompare(b.cultureId));
}

function normalizeCultureConfig(input, { packageDir, configPath }) {
  const cultureId = requireNonEmptyString(input.cultureId, `${configPath}: cultureId`);
  const packageName = requireNonEmptyString(input.packageName, `${configPath}: packageName`);
  const displayName = requireNonEmptyString(input.displayName, `${configPath}: displayName`);
  const vendorCultureDir = requireNonEmptyString(input.vendorCultureDir, `${configPath}: vendorCultureDir`);
  const anchorsPath = requireNonEmptyString(input.anchorsPath, `${configPath}: anchorsPath`);
  const configuredVersion = requireNonEmptyString(input.version, `${configPath}: version`);
  const description = requireNonEmptyString(input.description, `${configPath}: description`);
  const existingPackageJson = readExistingPackageJson(packageDir);
  return {
    cultureId,
    packageName,
    displayName,
    packageDir,
    cultureDir: path.resolve(vendorRoot, vendorCultureDir),
    anchorsPath: path.resolve(packageDir, anchorsPath),
    version: existingPackageJson?.name === packageName && typeof existingPackageJson.version === 'string'
      ? existingPackageJson.version
      : configuredVersion,
    description,
    license: input.license && typeof input.license === 'object' ? { ...input.license } : {},
  };
}

function readExistingPackageJson(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return null;
  try {
    return readJson(packageJsonPath);
  } catch {
    return null;
  }
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required ${label}.`);
  }
  return value.trim();
}

function normalizeAnchorRecord(value) {
  if (value && typeof value === 'object') {
    const icrs = normalizeIcrs(value.icrs);
    if (!icrs) {
      return null;
    }
    const fallback = raDecFromIcrs(icrs);
    return {
      icrs,
      raDeg: Number.isFinite(Number(value.raDeg)) ? Number(value.raDeg) : fallback.raDeg,
      decDeg: Number.isFinite(Number(value.decDeg)) ? Number(value.decDeg) : fallback.decDeg,
    };
  }

  return null;
}

function normalizeIcrs(value) {
  if (value && typeof value === 'object') {
    const x = Number(value.x);
    const y = Number(value.y);
    const z = Number(value.z);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
      ? { x, y, z }
      : null;
  }
  return null;
}

function raDecFromIcrs(icrs) {
  const { x, y, z } = icrs;
  const raDeg = ((Math.atan2(y, x) * 180 / Math.PI) % 360 + 360) % 360;
  const decDeg = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI;
  return { raDeg, decDeg };
}

function normalizeAnchorPixel(anchor) {
  const value = anchor?.pixel ?? anchor?.pos;
  if (Array.isArray(value) && value.length === 2) {
    return { x: Number(value[0]), y: Number(value[1]) };
  }
  if (value && typeof value === 'object') {
    return { x: Number(value.x), y: Number(value.y) };
  }
  return null;
}

function cloneJsonValue(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  return JSON.parse(JSON.stringify(value));
}

function createBoundaries(indexData) {
  const edges = Array.isArray(indexData.edges) ? [...indexData.edges] : [];
  if (
    edges.length === 0
    && indexData.edges_source == null
    && indexData.edges_epoch == null
    && indexData.edges_type == null
  ) {
    return null;
  }

  return {
    type: indexData.edges_type ?? null,
    source: indexData.edges_source ?? null,
    epoch: indexData.edges_epoch ?? null,
    format: 'stellarium-edge-string',
    edges,
  };
}

function buildManifest(indexData, anchorRecords, options) {
  const missingAnchors = [];
  const constellations = (indexData.constellations ?? []).map((constellation) => {
    const nextConstellation = {
      ...constellation,
    };

    if (!constellation.image || !Array.isArray(constellation.image.anchors)) {
      return nextConstellation;
    }

    const nextAnchors = constellation.image.anchors.map((anchor) => {
      const hip = anchor?.hip;
      const pixel = normalizeAnchorPixel(anchor);
      const anchorRecord = hip != null ? normalizeAnchorRecord(anchorRecords[String(hip)]) : null;
      if (!pixel || !anchorRecord) {
        missingAnchors.push({
          constellationId: constellation.id ?? constellation.iau ?? 'unknown',
          hip,
          reason: pixel ? 'missing-anchor-record' : 'missing-pixel',
        });
        return {
          ...anchor,
        };
      }

      const { pos, pixel: _pixel, ...anchorRest } = anchor;
      return {
        ...anchorRest,
        pixel,
        ...anchorRecord,
      };
    });

    nextConstellation.image = {
      ...constellation.image,
      anchors: nextAnchors,
    };

    return nextConstellation;
  });

  if (missingAnchors.length > 0) {
    const details = missingAnchors
      .slice(0, 10)
      .map(({ constellationId, hip, reason }) => `${constellationId}:${hip ?? 'unknown'}:${reason}`)
      .join(', ');
    throw new Error(`Invalid anchor data for ${missingAnchors.length} anchor(s): ${details}`);
  }

  return {
    format: SKYCULTURE_MANIFEST_FORMAT,
    sourceFormat: 'stellarium-skyculture',
    id: indexData.id,
    region: indexData.region ?? null,
    classification: Array.isArray(indexData.classification) ? [...indexData.classification] : [],
    fallbackToInternationalNames: indexData.fallback_to_international_names === true,
    languagesUsingNativeNames: Array.isArray(indexData.langs_use_native_names)
      ? [...indexData.langs_use_native_names]
      : [],
    thumbnail: indexData.thumbnail ?? null,
    thumbnailBscale: indexData.thumbnail_bscale ?? null,
    highlight: indexData.highlight ?? null,
    license: {
      ...options.license,
    },
    source: {
      cultureId: indexData.id,
      upstreamDirectory: path.basename(options.cultureDir),
      manifestFile: 'manifest.json',
      descriptionFile: 'description.md',
      illustrationsDirectory: 'illustrations',
    },
    astrometry: {
      anchors: { ...ANCHOR_ASTROMETRY },
    },
    constellations,
    commonNames: indexData.common_names ?? {},
    asterisms: cloneJsonValue(indexData.asterisms, []),
    boundaries: createBoundaries(indexData),
  };
}

function buildCulturePackage(config) {
  const distDir = path.join(config.packageDir, 'dist');
  const illustrationsSourceDir = path.join(config.cultureDir, 'illustrations');
  const illustrationsDistDir = path.join(distDir, 'illustrations');
  const descriptionSourcePath = path.join(config.cultureDir, 'description.md');
  const indexSourcePath = path.join(config.cultureDir, 'index.json');

  if (!fs.existsSync(config.cultureDir)) {
    throw new Error(`Missing culture directory for "${config.cultureId}": ${config.cultureDir}`);
  }
  if (!fs.existsSync(config.anchorsPath)) {
    throw new Error(`Missing anchor source for "${config.cultureId}": ${config.anchorsPath}`);
  }
  if (!fs.existsSync(illustrationsSourceDir)) {
    throw new Error(`Missing illustrations directory for "${config.cultureId}": ${illustrationsSourceDir}`);
  }

  const indexData = readJson(indexSourcePath);
  const anchorRecords = readJson(config.anchorsPath);
  const manifest = buildManifest(indexData, anchorRecords, config);

  removeDirectory(distDir);
  ensureDirectory(distDir);
  ensureDirectory(illustrationsDistDir);

  fs.cpSync(illustrationsSourceDir, illustrationsDistDir, { recursive: true });
  fs.copyFileSync(descriptionSourcePath, path.join(distDir, 'description.md'));
  const illustrationFiles = listIllustrationFiles(illustrationsDistDir);
  writeJson(path.join(distDir, 'manifest.json'), manifest);
  writeJson(path.join(config.packageDir, 'package.json'), createPackageJson(config));
  writeFile(path.join(config.packageDir, 'README.md'), createReadme(config));
  writeFile(path.join(config.packageDir, 'src/index.js'), createIndexModule());
  writeFile(path.join(config.packageDir, 'src/bundled.js'), createBundledModule(manifest, illustrationFiles));
  writeFile(path.join(config.packageDir, 'src/anchored-image.js'), createAnchoredImageModule(manifest, illustrationFiles));

  console.log(`Built ${config.cultureId} -> ${path.relative(repoRoot, distDir)}`);
}

function createPackageJson(config) {
  return {
    name: config.packageName,
    version: config.version,
    description: config.description,
    type: 'module',
    license: 'SEE LICENSE IN LICENSE.txt',
    repository: {
      type: 'git',
      url: 'git+https://github.com/Found-in-Space/stellarium-skycultures.git',
      directory: path.relative(repoRoot, config.packageDir),
    },
    files: [
      'dist',
      'src',
      'README.md',
      'LICENSE.txt',
    ],
    exports: {
      '.': './src/index.js',
      './bundled': './src/bundled.js',
      './anchored-image': './src/anchored-image.js',
      './manifest.json': './dist/manifest.json',
      './description.md': './dist/description.md',
      './illustrations/*': './dist/illustrations/*',
    },
    publishConfig: {
      access: 'public',
    },
    scripts: {
      build: `node ../../scripts/build-packages.js ${config.cultureId}`,
      prepack: `node ../../scripts/build-packages.js ${config.cultureId}`,
    },
  };
}

function createReadme(config) {
  return `# ${config.packageName}

Packaged ${config.displayName} constellation artwork derived from Stellarium sky cultures for Found in Space viewers.

## What This Package Contains

- \`dist/manifest.json\`: generated culture manifest with image anchors, ICRS and RA/Dec coordinates, anchor astrometry metadata, asterisms, and boundary metadata embedded
- \`dist/illustrations/*\`: packaged artwork assets
- \`dist/description.md\`: upstream culture description

The viewer should consume the generated manifest rather than the package's source-only HIP anchor lookup. Apps that only need anchored artwork can import the canonical anchored-image view from \`${config.packageName}/anchored-image\`.

Generated \`dist/\` output is intended to stay out of git. Build it locally or via \`prepack\` before publishing to npm.

## Manifest Shape

Anchor records use object-shaped coordinates:

\`\`\`json
{
  "hip": 97649,
  "pixel": { "x": 163, "y": 232 },
  "icrs": { "x": 0.459, "y": -0.875, "z": 0.154 },
  "raDeg": 297.698,
  "decDeg": 8.87
}
\`\`\`

\`astrometry.anchors\` declares that these anchors are ICRS unit vectors from the Hipparcos New Reduction catalogue, propagated from \`J1991.25\` to \`J2016.0\`. Boundary edges are preserved separately under \`boundaries\` with their own source, type, and epoch metadata.

## Build

From the repo root:

\`\`\`bash
npm run build -- ${config.cultureId}
\`\`\`

## Usage

No-bundler or CDN usage can fetch the generated manifest and resolve images relative to it:

\`\`\`js
import { manifestUrl } from '${config.packageName}';

const manifestResponse = await fetch(manifestUrl);
const manifest = await manifestResponse.json();
\`\`\`

Bundler usage can import asset URLs that are visible to Vite, Astro client scripts, Webpack 5, Rspack, Rollup with asset plugins, and Parcel with package exports enabled:

\`\`\`js
import { bundledManifest } from '${config.packageName}/bundled';
\`\`\`

For \`@found-in-space/anchored-image\`, import the canonical manifest view:

\`\`\`js
import { anchoredImageManifest } from '${config.packageName}/anchored-image';
\`\`\`

Astro frontmatter runs on the server, so use direct asset imports there:

\`\`\`js
import orionImage from '${config.packageName}/illustrations/orion.webp';
const orionUrl = typeof orionImage === 'string' ? orionImage : orionImage.src;
\`\`\`

The repository contains buildable fixtures for Astro static imports, Astro client scripts, Vite, Webpack 5, Rspack, Rollup, Parcel, esbuild direct asset imports, and Node ESM:

\`\`\`bash
npm run examples:build
\`\`\`

Parcel 2 requires:

\`\`\`json
{
  "@parcel/resolver-default": {
    "packageExports": true
  }
}
\`\`\`

The package intentionally does not publish data-url assets. Apps that need a single JavaScript artifact should inline assets in their own bundler configuration.
`;
}

function createIndexModule() {
  return `import manifestJson from '../dist/manifest.json' with { type: 'json' };

function cloneManifest(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeBaseUrl(value) {
  if (value instanceof URL) {
    return new URL(value.href.endsWith('/') ? value.href : \`\${value.href}/\`);
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return new URL(value.endsWith('/') ? value : \`\${value}/\`);
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
`;
}

function createBundledModule(manifest, illustrationFiles) {
  const imageFiles = [...new Set([...illustrationFiles, ...getManifestImageFiles(manifest)])].sort();
  const imageUrlEntries = imageFiles
    .map((file) => `  ${JSON.stringify(file)}: new URL(${JSON.stringify(`../dist/${file}`)}, import.meta.url).href,`)
    .join('\n');

  return `import { createManifest } from './index.js';

const imageUrls = {
${imageUrlEntries}
};

export const bundledManifest = withBundledAssetUrls(createManifest());

function withBundledAssetUrls(manifest) {
  return {
    ...manifest,
    assetBaseUrl: null,
    thumbnailUrl: typeof manifest.thumbnail === 'string'
      ? imageUrls[manifest.thumbnail] ?? manifest.thumbnail
      : undefined,
    constellations: manifest.constellations.map((constellation) => {
      const imageFile = constellation.image?.file;
      if (!imageFile) {
        return constellation;
      }
      return {
        ...constellation,
        image: {
          ...constellation.image,
          url: imageUrls[imageFile] ?? constellation.image.url ?? imageFile,
        },
      };
    }),
  };
}
`;
}

function createAnchoredImageModule(manifest, illustrationFiles) {
  const imageFiles = [...new Set([...illustrationFiles, ...getManifestImageFiles(manifest)])].sort();
  const imageUrlEntries = imageFiles
    .map((file) => `  ${JSON.stringify(file)}: new URL(${JSON.stringify(`../dist/${file}`)}, import.meta.url).href,`)
    .join('\n');

  return `import { createManifest } from './index.js';

export const ANCHORED_IMAGE_MANIFEST_FORMAT = ${JSON.stringify(ANCHORED_IMAGE_MANIFEST_FORMAT)};

const imageUrls = {
${imageUrlEntries}
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
    id: constellation.id ?? constellation.iau ?? \`anchored-image-\${index}\`,
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
`;
}

function getManifestImageFiles(manifest) {
  const files = new Set();
  if (typeof manifest.thumbnail === 'string' && manifest.thumbnail) {
    files.add(manifest.thumbnail);
  }
  for (const constellation of manifest.constellations ?? []) {
    if (typeof constellation.image?.file === 'string' && constellation.image.file) {
      files.add(constellation.image.file);
    }
  }
  return [...files].sort();
}

function listIllustrationFiles(illustrationsDistDir) {
  return fs.readdirSync(illustrationsDistDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((file) => /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file))
    .map((file) => `illustrations/${file}`)
    .sort();
}

const configs = discoverCulturePackageConfigs();
const configById = new Map(configs.map((config) => [config.cultureId, config]));
const requestedCultureIds = process.argv.slice(2);
const selectedConfigs = requestedCultureIds.length > 0
  ? requestedCultureIds.map((cultureId) => {
      const config = configById.get(cultureId);
      if (!config) {
        throw new Error(`Unknown culture package "${cultureId}". Known cultures: ${[...configById.keys()].join(', ')}`);
      }
      return config;
    })
  : configs;

if (selectedConfigs.length === 0) {
  throw new Error(`No skyculture package configs found under ${packagesRoot}.`);
}

for (const config of selectedConfigs) {
  buildCulturePackage(config);
}
