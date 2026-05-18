import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const vendorRoot = path.join(repoRoot, 'vendor/stellarium-skycultures');

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

function buildManifest(indexData, anchorDirections, options) {
  const missingDirections = [];
  const constellations = (indexData.constellations ?? []).map((constellation) => {
    const nextConstellation = {
      ...constellation,
    };

    if (!constellation.image || !Array.isArray(constellation.image.anchors)) {
      return nextConstellation;
    }

    const nextAnchors = constellation.image.anchors.map((anchor) => {
      const hip = anchor?.hip;
      const direction = hip != null ? anchorDirections[String(hip)] : null;
      if (!Array.isArray(direction) || direction.length !== 3) {
        missingDirections.push({
          constellationId: constellation.id ?? constellation.iau ?? 'unknown',
          hip,
        });
        return {
          ...anchor,
        };
      }

      return {
        ...anchor,
        direction,
      };
    });

    nextConstellation.image = {
      ...constellation.image,
      anchors: nextAnchors,
    };

    return nextConstellation;
  });

  if (missingDirections.length > 0) {
    const details = missingDirections
      .slice(0, 10)
      .map(({ constellationId, hip }) => `${constellationId}:${hip}`)
      .join(', ');
    throw new Error(`Missing anchor directions for ${missingDirections.length} anchor(s): ${details}`);
  }

  return {
    format: 'found-in-space-constellation-art-manifest@1',
    sourceFormat: 'stellarium-skyculture',
    id: indexData.id,
    region: indexData.region ?? null,
    classification: Array.isArray(indexData.classification) ? [...indexData.classification] : [],
    fallbackToInternationalNames: indexData.fallback_to_international_names === true,
    languagesUsingNativeNames: Array.isArray(indexData.langs_use_native_names)
      ? [...indexData.langs_use_native_names]
      : [],
    thumbnail: indexData.thumbnail ?? null,
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
    constellations,
    commonNames: indexData.common_names ?? {},
    edges: indexData.edges ?? [],
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
  const anchorDirections = readJson(config.anchorsPath);
  const manifest = buildManifest(indexData, anchorDirections, config);

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

  console.log(`Built ${config.cultureId} -> ${path.relative(repoRoot, distDir)}`);
}

function createPackageJson(config) {
  return {
    name: config.packageName,
    version: config.version,
    description: config.description,
    type: 'module',
    license: 'SEE LICENSE IN LICENSE.txt',
    files: [
      'dist',
      'src',
      'README.md',
      'LICENSE.txt',
    ],
    exports: {
      '.': './src/index.js',
      './bundled': './src/bundled.js',
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

- \`dist/manifest.json\`: generated culture manifest with per-anchor 3D direction vectors embedded
- \`dist/illustrations/*\`: packaged artwork assets
- \`dist/description.md\`: upstream culture description

The viewer should consume the generated manifest rather than the legacy standalone anchor data.

Generated \`dist/\` output is intended to stay out of git. Build it locally or via \`prepack\` before publishing to npm.

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

Bundler usage can import asset URLs that are visible to Vite/Rollup, Webpack 5, and Parcel 2:

\`\`\`js
import { bundledManifest } from '${config.packageName}/bundled';
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
export const assetBaseUrl = new URL('../dist/', import.meta.url);

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
