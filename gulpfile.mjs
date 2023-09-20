import gulp from 'gulp';

const { task, dest, src, series, parallel } = gulp;

import ts from 'gulp-typescript';

import babel from 'gulp-babel';

import less from 'gulp-less';

import concat from 'gulp-concat';

import { deleteAsync } from 'del';

// Clean the 'dist' directory before rebuilding
task('clean', () => {
  return deleteAsync(['dist/**/*']);
});

// Compile TypeScript to JavaScript
task('scripts', () => {
  const tsProject = ts.createProject('tsconfig.json');
  return gulp
    .src(['source/**/*.ts', 'source/**/*.tsx'])
    .pipe(tsProject())
    .pipe(babel())
    .pipe(dest('dist/js'));
});

// Compile LESS to CSS and concatenate
task('styles', () => {
  return gulp
    .src('source/**/*.less')
    .pipe(less())
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
task('default', series('clean', parallel('scripts', 'styles', 'copy-assets')));

// Development task: default + watch for changes
task('dev', series('default', 'watch'));
