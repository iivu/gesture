import typescript from '@rollup/plugin-typescript';

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: 'src/index.ts',
  output: [
    { format: 'cjs', file: 'dist/index.cjs.js' },
    { format: 'esm', file: 'dist/index.esm.js' },
    { format: 'umd', file: 'dist/index.umd.js', name: 'iivu' },
  ],
  plugins: [
    typescript(),
  ],
};

export default config;
