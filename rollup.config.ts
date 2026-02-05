// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const sharedPlugins = [
  typescript(),
  nodeResolve({ preferBuiltins: true, extensions: ['.ts', '.js'] }),
  commonjs()
]

const config = [
  // Main action entry point
  {
    input: 'src/index.ts',
    output: {
      esModule: true,
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true
    },
    plugins: sharedPlugins
  },
  // CLI entry point
  {
    input: 'src/cli.ts',
    output: {
      esModule: true,
      file: 'dist/cli.js',
      format: 'es',
      sourcemap: true
    },
    plugins: sharedPlugins
  }
]

export default config
