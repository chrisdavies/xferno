import childProcess from 'child_process';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import analyze from 'rollup-plugin-analyzer';

const production = !process.env.ROLLUP_WATCH;

console.log('Build environment:', production ? 'production' : 'development');

function getInputFile() {
  if (production) {
    return 'src/index.js';
  }
  const i = process.argv.indexOf('--in');
  if (i < 0) {
    return 'public/js/index.jsx';
  }
  return process.argv[i + 1];
}

function runNpm(cmdName) {
  const started = {};

  return {
    writeBundle() {
      if (!started[cmdName]) {
        started[cmdName] = true;

        childProcess.spawn('npm', ['run', cmdName], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        });
      }
    },
  };
}

export default {
  input: getInputFile(),
  output: {
    name: 'xferno',
    sourcemap: true,
    format: production
      ? [
          { file: 'dist/xferno.min.es.js', format: 'es' },
          { file: 'dist/xferno.min.umd.js', format: 'umd' }
        ]
      : [{ file: 'public/build/bundle.js', format: 'iife' }],
  },
  external: production ? ['inferno'] : [],
  plugins: [
    resolve({
      browser: true,
      extensions: ['.js', '.jsx'],
    }),

    commonjs(),

    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),

    babel({ babelHelpers: 'runtime', plugins: ['@babel/plugin-transform-runtime'] }),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && runNpm('start'),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),

    analyze(),
  ],
  watch: {
    clearScreen: false,
  },
};
