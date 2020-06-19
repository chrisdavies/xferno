import childProcess from 'child_process';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import analyze from 'rollup-plugin-analyzer';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

const production = !process.env.ROLLUP_WATCH;

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
  input: production ? 'src/index.js' : 'public/js/index.jsx',
  output: {
    name: 'xferno',
    sourcemap: true,
    format: production ? 'umd' : 'iife',
    file: production ? 'dist/xferno.js' : 'public/build/bundle.js',
  },
  plugins: [
    peerDepsExternal(),

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
