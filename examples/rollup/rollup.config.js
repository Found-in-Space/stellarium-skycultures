import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';

export default {
  input: 'src/main.js',
  output: {
    dir: 'dist',
    format: 'esm',
    assetFileNames: 'assets/[name]-[hash][extname]',
  },
  plugins: [
    nodeResolve(),
    json(),
    importMetaAssets(),
  ],
};
