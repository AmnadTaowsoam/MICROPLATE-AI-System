import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/server.ts', 'src/workers/aggregation.worker.ts'],
  project: ['src/**/*.ts'],
  ignore: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  ignoreDependencies: [
    '@types/*',
    'typescript',
    'eslint',
    'prettier',
    'jest',
    '@typescript-eslint/*',
    'tsc-alias',
    'tsx',
  ],
};

export default config;


