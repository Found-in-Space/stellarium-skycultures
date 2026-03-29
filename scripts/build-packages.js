import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const CULTURE_PACKAGES = {
  western: {
    packageDir: path.join(repoRoot, 'packages/stellarium-skycultures-western'),
    cultureDir: path.join(repoRoot, 'vendor/stellarium-skycultures/western'),
    anchorsPath: path.join(repoRoot, 'packages/stellarium-skycultures-western/source/constellation-anchors.json'),
    license: {
      textAndData: 'CC BY-SA',
      illustrations: 'Free Art License',
    },
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
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

function buildCulturePackage(cultureId, config) {
  const distDir = path.join(config.packageDir, 'dist');
  const illustrationsSourceDir = path.join(config.cultureDir, 'illustrations');
  const illustrationsDistDir = path.join(distDir, 'illustrations');
  const descriptionSourcePath = path.join(config.cultureDir, 'description.md');
  const indexSourcePath = path.join(config.cultureDir, 'index.json');

  if (!fs.existsSync(config.cultureDir)) {
    throw new Error(`Missing culture directory for "${cultureId}": ${config.cultureDir}`);
  }
  if (!fs.existsSync(config.anchorsPath)) {
    throw new Error(`Missing anchor source for "${cultureId}": ${config.anchorsPath}`);
  }

  const indexData = readJson(indexSourcePath);
  const anchorDirections = readJson(config.anchorsPath);
  const manifest = buildManifest(indexData, anchorDirections, config);

  removeDirectory(distDir);
  ensureDirectory(distDir);
  ensureDirectory(illustrationsDistDir);

  fs.cpSync(illustrationsSourceDir, illustrationsDistDir, { recursive: true });
  fs.copyFileSync(descriptionSourcePath, path.join(distDir, 'description.md'));
  writeJson(path.join(distDir, 'manifest.json'), manifest);

  console.log(`Built ${cultureId} -> ${path.relative(repoRoot, distDir)}`);
}

const requestedCultureIds = process.argv.slice(2);
const selectedCultureIds = requestedCultureIds.length > 0
  ? requestedCultureIds
  : Object.keys(CULTURE_PACKAGES);

for (const cultureId of selectedCultureIds) {
  const config = CULTURE_PACKAGES[cultureId];
  if (!config) {
    throw new Error(`Unknown culture package "${cultureId}"`);
  }
  buildCulturePackage(cultureId, config);
}
