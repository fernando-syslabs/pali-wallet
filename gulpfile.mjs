import gulp from 'gulp';
const { task, dest, src, series, parallel } = gulp;
import ts from 'gulp-typescript';
import sourceMaps from 'gulp-sourcemaps';
import babel from 'gulp-babel';
import less from 'gulp-less';
import concat from 'gulp-concat';
import merge from 'merge-stream';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcss from 'gulp-postcss';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteAsync } from 'del';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const viewsPath = path.join(__dirname, 'views');
const sourcePath = path.join(__dirname, 'source');

const entries = {
  webextension: path.join(
    __dirname,
    'node_modules',
    'webextension-polyfill-ts',
    'lib/index.js'
  ),
  background: path.join(sourcePath, 'scripts/Background', 'index.ts'),
  inpage: path.join(sourcePath, 'scripts/ContentScript', 'inject/inpage.ts'),
  pali: path.join(sourcePath, 'scripts/ContentScript', 'inject/pali.ts'),
  handleWindowProperties: path.join(
    sourcePath,
    'scripts/ContentScript',
    'inject/handleWindowProperties.ts'
  ),
  contentScript: path.join(sourcePath, 'scripts/ContentScript', 'index.ts'),
  app: path.join(sourcePath, 'pages/App', 'index.tsx'),
  external: path.join(sourcePath, 'pages/External', 'index.tsx'),
  trezorScript: path.join(
    sourcePath,
    'scripts/ContentScript/trezor',
    'trezor-content-script.ts'
  ),
  trezorUSB: path.join(
    sourcePath,
    'scripts/ContentScript/trezor',
    'trezor-usb-permissions.ts'
  ),
};

const jsonFiles = {
  manifest: path.join(__dirname, 'manifest.json'),
};

// Clean the 'dist' directory before rebuilding
task('clean', () => {
  return deleteAsync(['dist/**/*']);
});

// Compile TypeScript to JavaScript

task('scripts', () => {
  const scriptsTask = Object.keys(entries).map((scriptName) => {
    // Create a new TypeScript project for each entry
    const tsProject = ts.createProject('tsconfig.json');

    return src(entries[scriptName])
      .pipe(sourceMaps.init())
      .pipe(tsProject())
      .pipe(babel())
      .pipe(sourceMaps.write())
      .pipe(dest(`dist/js/${scriptName}`));
  });

  return merge(scriptsTask);
});

task('copy-json', async () => {
  const jsonTasks = Object.keys(jsonFiles).map((jsonName) => {
    return src(jsonFiles[jsonName]).pipe(dest(`dist/${jsonName}`));
  });

  return merge(jsonTasks);
});

// Compile LESS to CSS and concatenate
task('less-styles', () => {
  return src('source/**/*.less')
    .pipe(less())
    .pipe(postcss([cssnano]))
    .pipe(concat('less-styles.css'))
    .pipe(dest('dist/css'));
});

// Compile Tailwind CSS
task('styles', () => {
  return src('source/assets/styles/index.css')
    .pipe(postcss([tailwindcss('./tailwind.config.js'), autoprefixer, cssnano]))
    .pipe(concat('styles.css'))
    .pipe(dest('dist/css'));
});

// Copy static assets to 'dist' directory
task('copy-assets', () => {
  return src('source/assets/**/*').pipe(dest('dist/assets'));
});

// Watch for changes and trigger tasks
task('watch', () => {
  watch(['source/**/*.ts', 'source/**/*.tsx'], series('scripts'));
  watch('source/**/*.less', series('styles'));
  watch('source/assets/**/*', series('copy-assets'));
});

// Default task: clean, build scripts, styles, and copy assets
task(
  'default',
  series(
    'clean',
    parallel('scripts', 'copy-json', 'less-styles', 'styles', 'copy-assets')
  )
);

// Development task: default + watch for changes
task('dev', series('default', 'watch'));
