// See: https://jestjs.io/docs/configuration

// Suppress @actions/core workflow command output (::debug::, etc.) during tests
const processStdoutWrite = process.stdout.write.bind(process.stdout)
process.stdout.write = (str, encoding, callback) => {
  if (typeof str === 'string' && str.startsWith('::')) return true
  return processStdoutWrite(str, encoding, callback)
}

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ['./src/**'],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js'],
  preset: 'ts-jest',
  resolver: 'ts-jest-resolver',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/dist/', '/node_modules/'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  },
  verbose: true
}
