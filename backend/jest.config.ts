import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  // Increase timeout for integration tests (DB operations)
  testTimeout: 15000,
  // Global setup and teardown for integration tests
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  // Transform ESM packages (uuid, etc.) so Jest can handle them
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': ['ts-jest', { useESM: false }],
  },
  // Force exit after all tests complete (handles lingering DB connections)
  forceExit: true,
};

export default config;
