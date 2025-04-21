/** @type {import('ts-jest').JestConfigWithTsJest} **/
const path = require('path');
module.exports = {
  testEnvironment: 'node',
  module: 'es2020',
  preset: 'ts-jest',
  transform: {
    '^.+.tsx?$': [
      'ts-jest',
      {
        diagnostics: {
          ignoreCodes: [1343],
        },
        astTransformers: {
          before: [
            {
              path: 'node_modules/ts-jest-mock-import-meta', // or, alternatively, 'ts-jest-mock-import-meta' directly, without node_modules.
              options: { metaObjectReplacement: { url: 'https://www.url.com' } },
            },
          ],
        },
      },
    ],
  },
  moduleNameMapper: {
    '^Utility(.*)': '<rootDir>/source/application/Utility/$1',
    '^Managers(.*)': '<rootDir>/source/application/Managers/$1',
    '^Source(.*)': '<rootDir>/source/$1',
    '^Components(.*)': '<rootDir>/source/application/Components$1',
    PortalClient: '<rootDir>/dependencies/PortalClient/PortalClient.min.js',
  },
};
