import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/server.ts'],
  project: ['src/**/*.ts'],
  ignore: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  ignoreDependencies: [
    '@types/*',
    'typescript',
    'eslint',
    'prettier',
    'jest',
    '@typescript-eslint/*',
  ],
};

export default config;

