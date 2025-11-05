import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
  runner: 'local',
  specs: ['./src/e2e/**/*.e2e.ts'],
  maxInstances: 1,
  capabilities: [{
    browserName: 'chrome',
  }],
  logLevel: 'info',
  baseUrl: 'http://localhost:6410',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  services: [
    ['browserstack', {
      browserstackLocal: true,
      opts: {
        forcelocal: false,
      },
    }],
  ],
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
};

