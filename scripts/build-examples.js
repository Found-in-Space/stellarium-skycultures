import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const examplesRoot = path.join(repoRoot, 'examples');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fis-skyculture-examples-'));

try {
  const localPackages = packLocalPackages();
  for (const exampleDir of listExampleDirs()) {
    const name = path.basename(exampleDir);
    const workDir = path.join(tempRoot, name);
    fs.cpSync(exampleDir, workDir, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`) && !source.endsWith(`${path.sep}node_modules`),
    });
    useLocalPackages(workDir, localPackages);
    console.log(`\n==> Building example: ${name}`);
    run('npm', ['install', '--no-audit', '--no-fund'], workDir);
    run('npm', ['run', 'build'], workDir);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function listExampleDirs() {
  if (!fs.existsSync(examplesRoot)) return [];
  return fs.readdirSync(examplesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(examplesRoot, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'package.json')))
    .sort();
}

function packLocalPackages() {
  const tarballRoot = path.join(tempRoot, 'tarballs');
  fs.mkdirSync(tarballRoot, { recursive: true });

  const packageDirs = fs.readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesRoot, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'package.json')))
    .sort();

  const localPackages = new Map();
  for (const packageDir of packageDirs) {
    const packageJson = readJson(path.join(packageDir, 'package.json'));
    const before = new Set(fs.readdirSync(tarballRoot));
    console.log(`==> Packing local package: ${packageJson.name}`);
    run('npm', ['pack', '--pack-destination', tarballRoot], packageDir);
    const created = fs.readdirSync(tarballRoot)
      .filter((file) => file.endsWith('.tgz') && !before.has(file))
      .sort();
    if (created.length !== 1) {
      throw new Error(`Expected one tarball for ${packageJson.name}, found ${created.length}.`);
    }
    localPackages.set(packageJson.name, `file:${path.join(tarballRoot, created[0])}`);
  }

  return localPackages;
}

function useLocalPackages(workDir, localPackages) {
  const packageJsonPath = path.join(workDir, 'package.json');
  const packageJson = readJson(packageJsonPath);

  let changed = false;
  for (const sectionName of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const section = packageJson[sectionName];
    if (!section) continue;
    for (const [name, specifier] of localPackages) {
      if (Object.hasOwn(section, name)) {
        section[name] = specifier;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd} with exit code ${result.status}.`);
  }
}
