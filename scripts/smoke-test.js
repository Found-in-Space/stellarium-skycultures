import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');

const packageDirs = fs.readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesRoot, entry.name))
  .filter((packageDir) => fs.existsSync(path.join(packageDir, 'source/package-config.json')));

assert.ok(packageDirs.length > 0, 'expected at least one generated skyculture package');

for (const packageDir of packageDirs) {
  const config = readJson(path.join(packageDir, 'source/package-config.json'));
  const packageJson = readJson(path.join(packageDir, 'package.json'));
  const bundledSource = fs.readFileSync(path.join(packageDir, 'src/bundled.js'), 'utf8');
  const anchoredImageSource = fs.readFileSync(path.join(packageDir, 'src/anchored-image.js'), 'utf8');
  const illustrationFiles = fs.readdirSync(path.join(packageDir, 'dist/illustrations'))
    .filter((file) => file.endsWith('.webp'))
    .map((file) => `illustrations/${file}`)
    .sort();

  assert.equal(packageJson.name, config.packageName);
  assert.equal(packageJson.exports['.'], './src/index.js');
  assert.equal(packageJson.exports['./bundled'], './src/bundled.js');
  assert.equal(packageJson.exports['./anchored-image'], './src/anchored-image.js');
  assert.equal(packageJson.exports['./manifest.json'], './dist/manifest.json');
  assert.equal(packageJson.exports['./illustrations/*'], './dist/illustrations/*');

  const rootModule = await import(pathToFileURL(path.join(packageDir, 'src/index.js')));
  assert.deepEqual(Object.keys(rootModule).sort(), [
    'assetBaseUrl',
    'createManifest',
    'manifest',
    'manifestUrl',
    'resolveAssetUrl',
  ]);
  assert.equal(rootModule.manifest.id, config.cultureId);

  const bundledModule = await import(pathToFileURL(path.join(packageDir, 'src/bundled.js')));
  assert.ok(bundledModule.bundledManifest);
  assert.equal(bundledModule.bundledManifest.id, config.cultureId);
  assert.equal(bundledModule.bundledManifest.format, 'found-in-space/stellarium-skyculture-manifest@1');
  assertAstrometryMetadata(bundledModule.bundledManifest, config.cultureId);
  assertAnchorShape(bundledModule.bundledManifest, config.cultureId);
  assertPreservedStellariumData(bundledModule.bundledManifest, config.cultureId);

  const anchoredImageModule = await import(pathToFileURL(path.join(packageDir, 'src/anchored-image.js')));
  assert.equal(anchoredImageModule.ANCHORED_IMAGE_MANIFEST_FORMAT, 'found-in-space/anchored-image-manifest@1');
  assert.equal(anchoredImageModule.anchoredImageManifest.format, 'found-in-space/anchored-image-manifest@1');
  assert.equal(anchoredImageModule.anchoredImageManifest.images.length, bundledModule.bundledManifest.constellations.length);
  assertAnchoredImageManifest(anchoredImageModule.anchoredImageManifest, config.cultureId);

  const newUrlCount = (bundledSource.match(/new URL\("\.\.\/dist\/illustrations\/[^"]+\.webp", import\.meta\.url\)/g) ?? []).length;
  assert.equal(newUrlCount, illustrationFiles.length, `${config.cultureId} should expose every illustration through new URL()`);
  const anchoredImageNewUrlCount = (anchoredImageSource.match(/new URL\("\.\.\/dist\/illustrations\/[^"]+\.webp", import\.meta\.url\)/g) ?? []).length;
  assert.equal(anchoredImageNewUrlCount, illustrationFiles.length, `${config.cultureId} should expose every illustration through anchored-image new URL()`);
  for (const file of illustrationFiles) {
    assert.ok(bundledSource.includes(`"../dist/${file}"`), `missing bundled asset reference for ${file}`);
    assert.ok(anchoredImageSource.includes(`"../dist/${file}"`), `missing anchored-image asset reference for ${file}`);
  }
}

console.log(`Smoke-tested ${packageDirs.length} skyculture package(s).`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertAnchorShape(manifest, cultureId) {
  const anchor = manifest.constellations
    .flatMap((constellation) => constellation.image?.anchors ?? [])
    .find((candidate) => candidate.icrs && typeof candidate.icrs === 'object');
  assert.ok(anchor, `${cultureId} should include anchors with ICRS vectors`);
  assert.equal(anchor.direction, undefined, `${cultureId} should not emit legacy direction anchors`);
  assert.equal(anchor.pos, undefined, `${cultureId} should not emit legacy pos anchors`);
  assert.equal(Number.isFinite(anchor.pixel?.x), true, `${cultureId} anchor should include finite pixel.x`);
  assert.equal(Number.isFinite(anchor.pixel?.y), true, `${cultureId} anchor should include finite pixel.y`);
  for (const axis of ['x', 'y', 'z']) {
    assert.equal(Number.isFinite(anchor.icrs?.[axis]), true, `${cultureId} anchor icrs.${axis} should be finite`);
  }
  assert.equal(Number.isFinite(anchor.raDeg), true, `${cultureId} anchor should include finite raDeg`);
  assert.equal(Number.isFinite(anchor.decDeg), true, `${cultureId} anchor should include finite decDeg`);
}

function assertAnchoredImageManifest(manifest, cultureId) {
  const image = manifest.images.find((candidate) => candidate.image?.anchors?.length > 0);
  assert.ok(image, `${cultureId} anchored-image manifest should include anchored images`);
  assert.equal(typeof image.image.src, 'string', `${cultureId} anchored-image source should be resolved`);
  const anchor = image.image.anchors[0];
  assert.equal(Number.isFinite(anchor.pixel?.x), true, `${cultureId} anchored-image anchor should include finite pixel.x`);
  assert.equal(anchor.target?.kind, 'direction', `${cultureId} anchored-image anchor should use direction target`);
  assert.equal(anchor.target?.frame, 'icrs', `${cultureId} anchored-image anchor should use ICRS target frame`);
  assert.equal(Number.isFinite(anchor.target?.x), true, `${cultureId} anchored-image target should include finite x`);
  assert.equal(Number.isFinite(anchor.metadata?.hip), true, `${cultureId} anchored-image anchor should preserve HIP metadata`);
  assert.equal(Number.isFinite(anchor.metadata?.raDeg), true, `${cultureId} anchored-image anchor should preserve RA metadata`);
  assert.equal(Number.isFinite(anchor.metadata?.decDeg), true, `${cultureId} anchored-image anchor should preserve Dec metadata`);
}

function assertAstrometryMetadata(manifest, cultureId) {
  const anchors = manifest.astrometry?.anchors;
  assert.equal(anchors?.frame, 'icrs', `${cultureId} should declare anchor frame`);
  assert.equal(anchors?.coordinateKind, 'unit-vector', `${cultureId} should declare anchor coordinate kind`);
  assert.equal(anchors?.catalog, 'Hipparcos New Reduction', `${cultureId} should declare anchor catalog`);
  assert.equal(anchors?.vizierCatalog, 'I/311/hip2', `${cultureId} should declare Vizier catalog`);
  assert.equal(anchors?.sourceEpoch, 'J1991.25', `${cultureId} should declare source epoch`);
  assert.equal(anchors?.targetEpoch, 'J2016.0', `${cultureId} should declare target epoch`);
  assert.equal(anchors?.properMotionApplied, true, `${cultureId} should declare proper motion handling`);
}

function assertPreservedStellariumData(manifest, cultureId) {
  assert.equal(Array.isArray(manifest.asterisms), true, `${cultureId} should preserve Stellarium asterisms`);
  assert.equal(typeof manifest.boundaries, 'object', `${cultureId} should include boundary metadata when source edges exist`);
  assert.equal(Array.isArray(manifest.boundaries.edges), true, `${cultureId} boundaries should preserve raw edge strings`);
  assert.equal(typeof manifest.boundaries.format, 'string', `${cultureId} boundaries should declare their format`);
  if (manifest.boundaries.edges.length > 0) {
    assert.equal(typeof manifest.boundaries.edges[0], 'string', `${cultureId} boundary edges should remain raw Stellarium strings`);
  }
}
