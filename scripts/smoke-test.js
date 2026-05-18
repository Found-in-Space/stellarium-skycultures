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
  const illustrationFiles = fs.readdirSync(path.join(packageDir, 'dist/illustrations'))
    .filter((file) => file.endsWith('.webp'))
    .map((file) => `illustrations/${file}`)
    .sort();

  assert.equal(packageJson.name, config.packageName);
  assert.equal(packageJson.exports['.'], './src/index.js');
  assert.equal(packageJson.exports['./bundled'], './src/bundled.js');
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

  const newUrlCount = (bundledSource.match(/new URL\("\.\.\/dist\/illustrations\/[^"]+\.webp", import\.meta\.url\)/g) ?? []).length;
  assert.equal(newUrlCount, illustrationFiles.length, `${config.cultureId} should expose every illustration through new URL()`);
  for (const file of illustrationFiles) {
    assert.ok(bundledSource.includes(`"../dist/${file}"`), `missing bundled asset reference for ${file}`);
  }
}

console.log(`Smoke-tested ${packageDirs.length} skyculture package(s).`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
