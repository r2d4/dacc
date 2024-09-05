/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/packages',
    '<rootDir>/examples'
  ],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    'examples/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  projects: [
    '<rootDir>/packages/*',
    // '<rootDir>/examples/*'
  ],
  moduleNameMapper: {
    '^@dacc/(.*)$': '<rootDir>/packages/$1/src'
  },
  // Add this to make Jest work with pnpm
  moduleDirectories: ['node_modules', '<rootDir>/node_modules']
};