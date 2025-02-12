/** @type {import('ts-jest').JestConfigWithTsJest} **/
const path = require('path');
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  moduleNameMapper: {
    '^Utility(.*)': '<rootDir>/source/application/Utility/$1',
    '^Managers(.*)': '<rootDir>/source/application/Managers/$1',
    '^Source(.*)': '<rootDir>/source/$1',
    '^Components(.*)': '<rootDir>/source/application/Components$1',
    PortalClient: '<rootDir>/dependencies/PortalClient/PortalClient.min.js',
  },
};
