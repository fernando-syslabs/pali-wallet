import gulp from 'gulp';
const { task, dest, src, series, parallel } = gulp;
import ts from 'gulp-typescript';
import sourceMaps from 'gulp-sourcemaps';
import babel from 'gulp-babel';
import rename from 'gulp-rename';
import concat from 'gulp-concat';
import merge from 'merge-stream';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcss from 'gulp-postcss';
import inject from 'gulp-inject';
import nunjucksRender from 'gulp-nunjucks-render';
import htmlmin from 'gulp-htmlmin';

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

//HTML files from Views path that will be bundled and injected with the JS files
const htmlConfigs = [
  {
    template: 'app.html',
    filename: 'app.html',
    chunks: ['app'],
  },
  {
    template: 'external.html',
    filename: 'external.html',
    chunks: ['external'],
  },
  {
    template: 'trezor-usb-permissions.html',
    filename: 'trezor-usb-permissions.html',
    chunks: ['trezorUSB'],
  },
];

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
      .pipe(rename({ basename: scriptName, extname: '.js' })) // Rename each output file based on its entry name
      .pipe(sourceMaps.write())
      .pipe(dest(`dist/js`));
  });

  return merge(scriptsTask);
});

//Compile HTML files from View path and inject the JS files
task('htmls', () => {
  const tasks = htmlConfigs.map((config) => {
    //Get the HTML files by name that will be bundled
    const htmlSrc = src(path.join(viewsPath, config.template)).pipe(
      nunjucksRender({ path: [viewsPath] })
    );

    //Here is the each JS file that will be injected in each HTML file
    const sources = src(
      config.chunks.map((chunk) => `dist/js/${chunk}.js`),
      { read: false, allowEmpty: true }
    );

    //Bundle the HTML and inject the correct JS files based by name like app.html -> app.js
    return htmlSrc
      .pipe(
        inject(sources, {
          relative: true,
          transform: (filePath) => {
            return `<script defer src="${filePath}"></script>`;
          },
        })
      )
      .pipe(htmlmin({ collapseWhitespace: true }))
      .pipe(dest('dist', { overwrite: true }));
  });

  return merge(tasks);
});

//Compile the manifest.json file or any .json file that exists
task('copy-json', async () => {
  const jsonTasks = Object.keys(jsonFiles).map((jsonName) => {
    return src(jsonFiles[jsonName]).pipe(dest(`dist`));
  });

  return merge(jsonTasks);
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
    'scripts',
    'htmls',
    parallel('styles', 'copy-assets', 'copy-json')
  )
);

// Development task: default + watch for changes
task('dev', series('default', 'watch'));
