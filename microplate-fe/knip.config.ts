import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/main.tsx', 'src/App.tsx'],
  project: ['src/**/*.{ts,tsx}'],
  ignore: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
  ignoreDependencies: [
    '@types/*',
    'typescript',
    'eslint',
    'prettier',
  ],
};

export default config;

