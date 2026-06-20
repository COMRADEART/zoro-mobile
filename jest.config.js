// Pin the test timezone to UTC BEFORE worker processes fork (they inherit this
// env), so the UTC-anchored fixtures stay deterministic under the local-date
// logic on any machine/CI. Setting it here is reliable where setupFiles is not
// (some platforms cache TZ before setupFiles runs). setup.tz.js repeats it as a
// belt-and-suspenders for runners that honour runtime changes.
process.env.TZ = 'UTC';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  clearMocks: true,
  rootDir: '.',
  setupFiles: ['<rootDir>/tests/setup.tz.js'],
  moduleNameMapper: {
    '^../src/(.*)\\.js$': '<rootDir>/src/$1.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
};